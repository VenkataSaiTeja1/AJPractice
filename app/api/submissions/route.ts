import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

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

    // 2. Enforce 1-attempt limit for quizzes
    if (task.type === 'quiz') {
      const { count, error: countError } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('task_id', taskId);

      if (countError) {
        return NextResponse.json({ error: `Database error checking quiz limits: ${countError.message}` }, { status: 500 });
      }

      if (count !== null && count >= 1) {
        return NextResponse.json({ 
          error: 'Quiz already submitted! You are only permitted to attempt this quiz once.' 
        }, { status: 400 });
      }
    }

    // Handle Sandbox Runs (Console Execution only)
    if (isRun) {
      try {
        const compilerUrl = process.env.COMPILER_SERVICE_URL 
          ? `${process.env.COMPILER_SERVICE_URL.replace(/\/$/, '')}/api/run-java`
          : `${new URL(req.url).origin}/api/run-java`;

        const runResponse = await fetch(compilerUrl, {
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
        
        const compilerUrl = process.env.COMPILER_SERVICE_URL 
          ? `${process.env.COMPILER_SERVICE_URL.replace(/\/$/, '')}/api/run-java`
          : `${new URL(req.url).origin}/api/run-java`;

        let allPassed = true;
        let gradingFeedback = '';

        if (testCases.length === 0 && !task.expected_output) {
          // Play-ground / Sandbox mode: No test cases configured. 
          // Just compile and run once to verify compilation/execution status
          const runResponse = await fetch(compilerUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              code: submittedContent,
              stdin: stdin || ''
            }),
          });

          if (!runResponse.ok) {
            const runJavaErr = await runResponse.json().catch(() => ({}));
            throw new Error(`Execution failed: ${runJavaErr.error || 'Compiler API error'}`);
          }

          const runResult = await runResponse.json();
          const runOutput = runResult.run || {};
          const stderr = runOutput.stderr || '';

          if (runOutput.code !== 0 || stderr) {
            allPassed = false;
            gradingFeedback = `Compilation/Execution Error:\n${stderr || runOutput.output}`;
          } else {
            allPassed = true;
            gradingFeedback = `Program compiled and executed successfully! (No test cases configured for this task)`;
          }
        } else {
          // Traditional Test Cases / Expected Output grading mode
          let casesToRun = testCases;
          if (casesToRun.length === 0) {
            casesToRun = [{ input: '', expected: task.expected_output || '' }];
          }

          let testCaseIndex = 1;
          for (const tc of casesToRun) {
            const runResponse = await fetch(compilerUrl, {
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
              if (tc.isHidden) {
                gradingFeedback = `Hidden Test Case #${testCaseIndex} Execution Error: The program crashed during execution.`;
              } else {
                gradingFeedback = `Test Case #${testCaseIndex} Compilation/Execution Error:\n${stderr || runOutput.output}`;
              }
              break;
            }

            const expected = normalizeString(tc.expected || '');
            const actual = normalizeString(stdout);

            if (expected !== actual) {
              allPassed = false;
              if (tc.isHidden) {
                gradingFeedback = `Hidden Test Case #${testCaseIndex} Output Mismatch: The program output did not match expectations.`;
              } else {
                gradingFeedback = `Test Case #${testCaseIndex} Output Mismatch.\n\nInput parameters:\n"${tc.input || '(none)'}"\n\nExpected:\n"${expected}"\n\nActual:\n"${actual}"`;
              }
              break;
            }

            testCaseIndex++;
          }
        }

        if (allPassed) {
          status = 'passed';
          score = 100;
          feedback = gradingFeedback || 'All checks passed successfully!';
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

    // 4. Update student's overall quiz and coding scores in profiles table
    try {
      await updateStudentOverallGrades(studentId);
    } catch (gradeUpdateErr: any) {
      console.error('Error updating overall grades:', gradeUpdateErr.message);
    }

    return NextResponse.json({
      success: true,
      submission,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

async function updateStudentOverallGrades(studentId: string) {
  // 1. Fetch student profile to get their target year and section
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', studentId)
    .single();

  if (profileErr || !profile) {
    throw new Error(`Profile not found for student ${studentId}: ${profileErr?.message}`);
  }

  // 2. Fetch all tasks
  const { data: allTasks, error: tasksErr } = await supabase
    .from('tasks')
    .select('*');

  if (tasksErr) {
    throw new Error(`Failed to fetch tasks: ${tasksErr.message}`);
  }

  // 3. Filter tasks assigned to this student
  const studentYear = profile.year || 3;
  const studentTasks = (allTasks || []).filter(t => {
    if (t.year !== studentYear) return false;
    if (studentYear === 2) {
      return t.section === profile.section || t.section === 'All' || !t.section;
    }
    return true;
  });

  // 4. Fetch all real submissions by this student
  const { data: allSubmissions, error: subsErr } = await supabase
    .from('submissions')
    .select('*')
    .eq('student_id', studentId)
    .eq('is_run', false);

  if (subsErr) {
    throw new Error(`Failed to fetch submissions: ${subsErr.message}`);
  }

  // 5. Find highest score per task
  const bestSubmissions: { [key: string]: any } = {};
  (allSubmissions || []).forEach(sub => {
    if (!bestSubmissions[sub.task_id] || sub.score > bestSubmissions[sub.task_id].score) {
      bestSubmissions[sub.task_id] = sub;
    }
  });

  const now = new Date();

  // --- QUIZ SCORE CALCULATION ---
  // Quiz tasks assigned to the student that have started
  const scheduledQuizzes = studentTasks.filter(t => {
    if (t.type !== 'quiz') return false;
    return !t.start_time || new Date(t.start_time) <= now;
  });

  const attemptedQuizzes = scheduledQuizzes.filter(t => !!bestSubmissions[t.id]);
  const attemptedQuizCount = attemptedQuizzes.length;
  const missedQuizCount = scheduledQuizzes.length - attemptedQuizCount;

  let finalQuizScore = 0;
  if (attemptedQuizCount > 0) {
    const totalQuizScoreSum = attemptedQuizzes.reduce((sum, t) => sum + (bestSubmissions[t.id].score || 0), 0);
    const averageQuizPercent = totalQuizScoreSum / attemptedQuizCount; // 0 to 100
    const averageQuizOutOf10 = averageQuizPercent / 10; // 0 to 10
    finalQuizScore = Math.max(0, averageQuizOutOf10 - missedQuizCount);
  }

  // --- CODING SCORE CALCULATION ---
  // Coding tasks assigned to the student that have started
  const scheduledCoding = studentTasks.filter(t => {
    if (t.type !== 'coding') return false;
    return !t.start_time || new Date(t.start_time) <= now;
  });

  const attemptedCoding = scheduledCoding.filter(t => !!bestSubmissions[t.id]);
  const attemptedCodingCount = attemptedCoding.length;

  let finalCodingScore = 0;
  if (attemptedCodingCount > 0) {
    // Average of attempted coding tasks, normalized to 10
    const totalCodingScoreSum = attemptedCoding.reduce((sum, t) => sum + (bestSubmissions[t.id].score || 0), 0);
    const averageCodingPercent = totalCodingScoreSum / attemptedCodingCount;
    finalCodingScore = averageCodingPercent / 10;
  }

  // 6. Save computed scores to profiles table
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({
      overall_quiz_score: finalQuizScore,
      overall_coding_score: finalCodingScore
    })
    .eq('id', studentId);

  if (updateErr) {
    throw new Error(`Failed to update student profile scores: ${updateErr.message}`);
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
