import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper to normalize strings for comparison
function normalizeString(str: string): string {
  return str.replace(/\r\n/g, '\n').trim();
}

export async function POST(req: Request) {
  try {
    const { studentId, taskId, submittedContent } = await req.json();

    if (!studentId || !taskId || submittedContent === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Fetch task details from database
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    let status: 'passed' | 'failed' | 'pending' = 'pending';
    let score = 0;
    let feedback = '';

    // 2. Grade based on Task Type
    if (task.type === 'quiz') {
      try {
        const studentAnswers = JSON.parse(submittedContent);
        const metadata = task.metadata || {};
        const questions = metadata.questions || [];
        
        let correctCount = 0;
        const totalQuestions = questions.length;

        if (totalQuestions > 0) {
          questions.forEach((q: any) => {
            const studentAns = studentAnswers[q.id];
            const correctAns = q.correctOption;
            if (studentAns !== undefined && String(studentAns) === String(correctAns)) {
              correctCount++;
            }
          });
          score = Math.round((correctCount / totalQuestions) * 100);
          status = score >= 60 ? 'passed' : 'failed';
          feedback = `Auto-graded: ${correctCount}/${totalQuestions} questions correct (${score}%).`;
        } else {
          score = 100;
          status = 'passed';
          feedback = 'Auto-graded: No questions found in quiz.';
        }
      } catch (err: any) {
        return NextResponse.json({ error: `Malformed quiz submission: ${err.message}` }, { status: 400 });
      }
    } else if (task.type === 'coding') {
      // Execute code via dynamic local/cloud Java bridge for all test cases
      try {
        const metadata = task.metadata || {};
        const testCases = metadata.testCases || [];
        
        // Fallback to legacy single expected output if no test cases list exists
        let casesToRun = testCases;
        if (casesToRun.length === 0) {
          casesToRun = [{ input: '', expected: task.expected_output || '' }];
        }

        let allPassed = true;
        let gradingFeedback = '';
        let testCaseIndex = 1;

        for (const tc of casesToRun) {
          const runResponse = await fetch(`${new URL(req.url).origin}/api/run-java`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              code: submittedContent,
              stdin: tc.input || ''
            }),
          });

          if (!runResponse.ok) {
            const runJavaErr = await runResponse.json().catch(() => ({}));
            throw new Error(`Test case #${testCaseIndex} failed: ${runJavaErr.error || 'Execution failed'}`);
          }

          const runResult = await runResponse.json();
          const runOutput = runResult.run || {};
          const stdout = runOutput.stdout || '';
          const stderr = runOutput.stderr || '';

          if (runOutput.code !== 0 || stderr) {
            allPassed = false;
            gradingFeedback = `Test Case #${testCaseIndex} Compilation/Execution Error:\n${stderr || runOutput.output}`;
            break;
          }

          const expected = normalizeString(tc.expected || '');
          const actual = normalizeString(stdout);

          if (expected !== actual) {
            allPassed = false;
            gradingFeedback = `Test Case #${testCaseIndex} Output Mismatch.\n\nInput parameters:\n"${tc.input || '(none)'}"\n\nExpected:\n"${expected}"\n\nActual:\n"${actual}"`;
            break;
          }

          testCaseIndex++;
        }

        if (allPassed) {
          status = 'passed';
          score = 100;
          feedback = `All ${casesToRun.length} test cases passed successfully! Outputs match expectations.`;
        } else {
          status = 'failed';
          score = 0;
          feedback = gradingFeedback;
        }

      } catch (err: any) {
        status = 'failed';
        score = 0;
        feedback = `Auto-grading failed due to compiler execution error: ${err.message}`;
      }
    } else if (task.type === 'cloud_lab') {
      // Cloud Labs require manual review by teacher
      status = 'pending';
      score = 0;
      feedback = 'Submitted Git repository/deployment link. Awaiting teacher review.';
    }

    // 3. Save submission to Database
    const { data: submission, error: submitError } = await supabase
      .from('submissions')
      .insert({
        student_id: studentId,
        task_id: taskId,
        submitted_content: submittedContent,
        status,
        score,
        feedback,
      })
      .select()
      .single();

    if (submitError) {
      return NextResponse.json({ error: `Failed to save submission: ${submitError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      submission,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const taskId = searchParams.get('taskId');

    let query = supabase.from('submissions').select('*, profiles(full_name, roll_number), tasks(title, unit_number, type)');

    if (studentId) {
      query = query.eq('student_id', studentId);
    }
    if (taskId) {
      query = query.eq('task_id', taskId);
    }

    const { data, error } = await query.order('submitted_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
