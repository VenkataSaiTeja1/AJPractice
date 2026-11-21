import { NextResponse } from 'next/server';
import { executeAiQuery } from '@/lib/ai-service';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      query = '', 
      facultyEmail = '', 
      facultyRole = '',
      chatHistory = [] 
    } = body;

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'Query is required.' }, { status: 400 });
    }

    // 1. Verify Faculty Authorization
    if (facultyRole !== 'faculty' || !facultyEmail) {
      return NextResponse.json({ 
        error: 'Access denied. The AI Database Analyst is restricted to authorized faculty members only.' 
      }, { status: 403 });
    }

    const { data: facultyProfile } = await supabase
      .from('profiles')
      .select('id, full_name, role, email')
      .eq('email', facultyEmail.trim())
      .eq('role', 'faculty')
      .single();

    if (!facultyProfile) {
      return NextResponse.json({ 
        error: 'Unauthorized: No faculty record found for this account.' 
      }, { status: 403 });
    }

    // 2. Fetch Live Database Records from Supabase
    const [profilesRes, tasksRes, subsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('roll_number', { ascending: true }),
      supabase.from('tasks').select('*').order('unit_number', { ascending: true }),
      supabase.from('submissions').select(`
        id, task_id, student_id, status, score, is_verified, submitted_at,
        tasks:task_id(title, unit_number, type, year, section)
      `).order('submitted_at', { ascending: false })
    ]);

    const allProfiles = profilesRes.data || [];
    const allTasks = tasksRes.data || [];
    const allSubmissions = (subsRes.data || []).filter(s => !(s as any).is_run);

    const students = allProfiles.filter(p => p.role === 'student');

    // 3. Compute Aggregated Classroom Intelligence
    const totalStudents = students.length;
    const caiStudents = students.filter(s => (s.roll_number || '').toUpperCase().includes('43'));
    const csdStudents = students.filter(s => (s.roll_number || '').toUpperCase().includes('44'));

    // Student performance breakdown
    const studentPerformance = students.map(student => {
      const studentSubs = allSubmissions.filter(s => s.student_id === student.id);
      const passedSubs = studentSubs.filter(s => s.status === 'passed');
      const failedSubs = studentSubs.filter(s => s.status === 'failed');
      const avgScore = studentSubs.length > 0 
        ? Math.round(studentSubs.reduce((acc, curr) => acc + (curr.score || 0), 0) / studentSubs.length) 
        : 0;

      const roll = (student.roll_number || '').toUpperCase();
      const section = roll.includes('43') ? 'CAI' : roll.includes('44') ? 'CSD' : (student.section || 'General');

      return {
        rollNumber: student.roll_number || 'N/A',
        name: student.full_name,
        section,
        totalSubmissions: studentSubs.length,
        passedCount: passedSubs.length,
        failedCount: failedSubs.length,
        avgScore
      };
    });

    // Task completion metrics
    const taskMetrics = allTasks.map(task => {
      const taskSubs = allSubmissions.filter(s => s.task_id === task.id);
      const passed = taskSubs.filter(s => s.status === 'passed').length;
      const failed = taskSubs.filter(s => s.status === 'failed').length;
      const passRate = taskSubs.length > 0 ? Math.round((passed / taskSubs.length) * 100) : 0;

      return {
        id: task.id,
        title: task.title,
        unit: task.unit_number,
        type: task.type,
        year: task.year,
        totalAttempts: taskSubs.length,
        passed,
        failed,
        passRate: `${passRate}%`
      };
    });

    // Identify non-attempted / inactive students
    const zeroSubmissionStudents = studentPerformance.filter(s => s.totalSubmissions === 0);
    // Identify struggling students (has attempted tasks but fail count > pass count or avgScore < 40)
    const strugglingStudents = studentPerformance.filter(s => s.totalSubmissions > 0 && (s.failedCount >= s.passedCount || s.avgScore < 40));

    // 4. Construct Data Summary for AI Context
    const databaseContext = `
CLASSROOM DATABASE CONTEXT:
• Total Registered Students: ${totalStudents} (CAI Section: ${caiStudents.length}, CSD Section: ${csdStudents.length})
• Total Assigned Curriculum Tasks: ${allTasks.length}
• Total Graded Submissions: ${allSubmissions.length}
• Students with Zero Submissions: ${zeroSubmissionStudents.length} (${zeroSubmissionStudents.map(s => s.rollNumber).join(', ') || 'None'})

TASK METRICS SUMMARY:
${taskMetrics.map(t => `- [Unit ${t.unit} - ${t.type.toUpperCase()}] "${t.title}": ${t.passed} Passed, ${t.failed} Failed (Pass Rate: ${t.passRate})`).join('\n')}

STUDENT PERFORMANCE SNAPSHOT (First 40 records):
${studentPerformance.slice(0, 40).map(s => `- ${s.rollNumber} (${s.name}, Sec: ${s.section}): ${s.passedCount} Passed, ${s.failedCount} Failed, Avg Score: ${s.avgScore}%`).join('\n')}

STRUGGLING STUDENTS LIST:
${strugglingStudents.length > 0 
  ? strugglingStudents.map(s => `- ${s.rollNumber} (${s.name}, Sec: ${s.section}): ${s.failedCount} failed vs ${s.passedCount} passed (Avg: ${s.avgScore}%)`).join('\n')
  : 'None currently struggling below 40% threshold.'}
`;

    // 5. System Prompt for Faculty Analyst
    const systemPrompt = `You are "VVS Faculty AI Copilot", an academic database analyst for engineering professors teaching C Programming and Data Structures.
You have direct, real-time access to the student roster, test case submissions, and score metrics provided in the database context.

INSTRUCTIONS:
1. ACCURACY & EVIDENCE: Answer the faculty member's question strictly using the provided database data. Cite specific roll numbers, names, percentages, and task titles.
2. FORMATTING: Use clean markdown tables, bold highlights, and bullet points so the professor can read the report at a glance.
3. PEDAGOGICAL INSIGHTS: When appropriate, offer constructive recommendations (e.g. "Unit 2 tasks have a 45% fail rate, indicating students may need a review on Pointer Arithmetic").
4. SCOPE: Focus exclusively on student scores, attendance, curriculum tasks, and academic performance.
5. TONE: Professional, concise, academic, and executive.`;

    const userMessage = `${databaseContext}\n\nFaculty Question: "${query}"`;

    const messages = [
      ...chatHistory.slice(-4).map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      })),
      { role: 'user', content: userMessage }
    ];

    const fallbackResponse = `### 📊 Database Analysis\n\n• **Total Students:** ${totalStudents} (CAI: ${caiStudents.length}, CSD: ${csdStudents.length})\n• **Total Submissions:** ${allSubmissions.length}\n• **Zero Activity Students:** ${zeroSubmissionStudents.length} students have not submitted any tasks yet.\n• **Tasks Configured:** ${allTasks.length} active tasks across curriculum units.`;

    const aiResult = await executeAiQuery(messages, systemPrompt, fallbackResponse);

    return NextResponse.json({
      reply: aiResult.text,
      provider: aiResult.provider,
      stats: {
        totalStudents,
        totalTasks: allTasks.length,
        totalSubmissions: allSubmissions.length,
        zeroActivityCount: zeroSubmissionStudents.length,
        strugglingCount: strugglingStudents.length
      }
    });

  } catch (err: any) {
    console.error('[Faculty AI Analyst Error]:', err.message);
    return NextResponse.json({
      error: err.message || 'Failed to analyze classroom database.'
    }, { status: 500 });
  }
}
