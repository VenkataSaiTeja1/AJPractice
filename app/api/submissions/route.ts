import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper to normalize strings for comparison
function normalizeString(str: string): string {
  return str.replace(/\r\n/g, '\n').trim();
}

export async function POST(req: Request) {
  try {
    const { studentId, taskId, submittedContent, isRun = false, stdin = '' } = await req.json();

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

    // 2. Enforce 7-execution limit (runs + submissions) for coding tasks
    if (task.type === 'coding') {
      const { count, error: countError } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('task_id', taskId);

      if (countError) {
        return NextResponse.json({ error: `Database error checking execution limits: ${countError.message}` }, { status: 500 });
      }

      if (count !== null && count >= 7) {
        return NextResponse.json({ 
          error: 'Execution limit reached! You are only allowed 7 executions (including both runs and submissions) per task.' 
        }, { status: 400 });
      }
    }

    // Handle Sandbox Runs (Console Execution only)
    if (isRun) {
      try {
        const runResponse = await fetch(`${new URL(req.url).origin}/api/run-java`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            code: submittedContent,
            stdin: stdin
          }),
        });

        if (!runResponse.ok) {
          const runJavaErr = await runResponse.json().catch(() => ({}));
          return NextResponse.json({ error: runJavaErr.error || 'Execution failed' }, { status: 500 });
        }

        const runResult = await runResponse.json();

        // Save execution to submissions table as a run log to count towards the 7-execution limit
        const { error: runLogErr } = await supabase
          .from('submissions')
          .insert({
            student_id: studentId,
            task_id: taskId,
            submitted_content: '[Run execution - code not saved]',
            status: 'failed', // Runs do not grade as passed
            score: 0,
            feedback: 'Console sandbox execution run.',
            is_run: true
          });

        if (runLogErr) {
          console.error('Failed to log run execution:', runLogErr.message);
        }

        return NextResponse.json(runResult);

      } catch (err: any) {
        return NextResponse.json({ error: `Run execution compiler error: ${err.message}` }, { status: 500 });
      }
    }

    // Handle Submissions
    let status: 'passed' | 'failed' | 'pending' = 'pending';
    let score = 0;
    let feedback = '';

    // Grade based on Task Type
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
        is_run: false
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
    const includeRuns = searchParams.get('includeRuns') === 'true';

    let query = supabase.from('submissions').select('*, profiles(full_name, roll_number), tasks(title, unit_number, type)');

    if (studentId) {
      query = query.eq('student_id', studentId);
    }
    if (taskId) {
      query = query.eq('task_id', taskId);
    }
    // Filter runs out by default to keep logs clean
    if (!includeRuns) {
      query = query.eq('is_run', false);
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
