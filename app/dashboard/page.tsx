'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  Award, CheckCircle, Clock, XCircle, Code, HelpCircle, Server, 
  BookOpen, ChevronRight, BarChart3, Star, RefreshCw 
} from 'lucide-react';

const SEED_TASKS = [
  {
    unit_number: 1,
    title: 'JDBC Driver Types Architecture Quiz',
    description: 'Test your understanding of JDBC driver classifications (Type 1 to Type 4), their architectural layers, and performance characteristics.',
    type: 'quiz',
    metadata: {
      questions: [
        {
          id: 'q1',
          question: 'Which JDBC driver type is also known as the Thin Driver and converts JDBC calls directly into vendor-specific database protocols?',
          options: ['Type 1: JDBC-ODBC Bridge', 'Type 2: Native-API/Partly-Java', 'Type 3: Network-Protocol/Middleware', 'Type 4: Pure Java/Thin Driver'],
          correctOption: 3
        },
        {
          id: 'q2',
          question: 'What is a major disadvantage of using a Type 1 JDBC-ODBC bridge driver?',
          options: ['It requires client-side installation of ODBC binary libraries.', 'It communicates only over encrypted sockets.', 'It is written in pure Java and consumes excessive memory.', 'It does not support transactions.'],
          correctOption: 0
        },
        {
          id: 'q3',
          question: 'Which driver type relies on a middleware application server to translate requests to vendor databases?',
          options: ['Type 1', 'Type 2', 'Type 3', 'Type 4'],
          correctOption: 2
        }
      ]
    }
  },
  {
    unit_number: 1,
    title: 'JDBC Statement batch execution sandbox',
    description: 'Implement a Java main method that performs SQL updates using batch execution to optimize database writes. Make sure the output confirms batch updates were executed.',
    type: 'coding',
    starter_code: `import java.sql.*;

public class Main {
    public static void main(String[] args) {
        // Construct code that simulates adding parameters into a statement batch
        System.out.println("Adding query 1 to batch...");
        System.out.println("Adding query 2 to batch...");
        System.out.println("Executing batch of size 2 successfully.");
        // Expected output must match: Adding query 1 to batch...\\nAdding query 2 to batch...\\nExecuting batch of size 2 successfully.
    }
}`,
    expected_output: `Adding query 1 to batch...\nAdding query 2 to batch...\nExecuting batch of size 2 successfully.`
  },
  {
    unit_number: 2,
    title: 'Servlet Life Cycle & Web Containers Quiz',
    description: 'Examine key stages in the Servlet lifecycle, including dynamic initialization, service dispatching, thread pools, and final destruction.',
    type: 'quiz',
    metadata: {
      questions: [
        {
          id: 'q1',
          question: 'How many times is a servlet\'s init() method called during its entire deployment lifecycle?',
          options: ['Exactly once per request', 'Exactly once when loaded by the container', 'Every time a new session starts', 'Zero times unless explicitly defined in web.xml'],
          correctOption: 1
        },
        {
          id: 'q2',
          question: 'Which method in the HttpServlet class decides whether a request should route to doGet(), doPost(), or other methods?',
          options: ['init()', 'service()', 'dispatch()', 'destroy()'],
          correctOption: 1
        },
        {
          id: 'q3',
          question: 'When the container destroys a servlet, what occurs next?',
          options: ['Garbage collection immediately frees memory.', 'The destroy() method executes once to release resources.', 'The servlet waits for 5 minutes before removal.', 'A new instance is spawned in background.'],
          correctOption: 1
        }
      ]
    }
  },
  {
    unit_number: 3,
    title: 'JSP Implicit Objects & Scopes Quiz',
    description: 'Explore JSP implicit objects like pageContext, request, session, application, and expression language (EL) variable resolution scopes.',
    type: 'quiz',
    metadata: {
      questions: [
        {
          id: 'q1',
          question: 'Which JSP implicit object represents the configuration parameters specified in the web.xml file for the current page?',
          options: ['config', 'pageContext', 'application', 'session'],
          correctOption: 0
        },
        {
          id: 'q2',
          question: 'In JSP, what is the default scope for variables created using <c:set> if the scope attribute is omitted?',
          options: ['page', 'request', 'session', 'application'],
          correctOption: 0
        }
      ]
    }
  },
  {
    unit_number: 4,
    title: 'CRUD JSP & JSTL MVC Web Cloud Lab',
    description: 'Build a standard model-view-controller web application containing a CRUD table formatted with JSTL tags. Deploy on Tomcat container.',
    type: 'cloud_lab',
    cloud_ide_url: 'https://github.com/codespaces/new?repo=github/codespaces-blank',
    starter_code: '// Paste your GitHub Repository or Deploy URL here'
  },
  {
    unit_number: 5,
    title: 'Spring Core Constructor vs Setter Injection Sandbox',
    description: 'Construct a simple Java program using Setter dependency injection manually or simulated. Print configured values.',
    type: 'coding',
    starter_code: `public class Main {
    public static void main(String[] args) {
        System.out.println("Initializing Spring Container...");
        System.out.println("Setter injected value: Database Connection Configured");
    }
}`,
    expected_output: `Initializing Spring Container...\nSetter injected value: Database Connection Configured`
  },
  {
    unit_number: 5,
    title: 'Spring MVC Controller & AOP aspect Cloud Lab',
    description: 'Construct a standard Spring Boot application that logs execution timings using an aspect oriented aspect. Verify REST output.',
    type: 'cloud_lab',
    cloud_ide_url: 'https://github.com/codespaces/new?repo=github/codespaces-blank',
    starter_code: '// Paste your GitHub Repository URL showing @Aspect and @RestController files'
  }
];

export default function StudentDashboard() {
  const router = useRouter();
  
  // Auth state
  const [profile, setProfile] = useState<any>(null);
  
  // App data states
  const [tasks, setTasks] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    rate: 0
  });

  const fetchData = async (user: any) => {
    try {
      setLoading(true);

      // Fetch Tasks
      let { data: dbTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('unit_number', { ascending: true })
        .order('title', { ascending: true });

      if (tasksError) throw tasksError;

      // Automatically seed tasks if none exist
      if (!dbTasks || dbTasks.length === 0) {
        setSeeding(true);
        const { error: seedError } = await supabase.from('tasks').insert(SEED_TASKS);
        if (seedError) {
          console.error('Error seeding tasks:', seedError);
        } else {
          // Re-fetch tasks
          const { data: reTasks } = await supabase
            .from('tasks')
            .select('*')
            .order('unit_number', { ascending: true });
          dbTasks = reTasks;
        }
        setSeeding(false);
      }

      setTasks(dbTasks || []);

      // Fetch Submissions for this student
      const { data: dbSubmissions, error: subError } = await supabase
        .from('submissions')
        .select('*')
        .eq('student_id', user.id);

      if (subError) throw subError;
      setSubmissions(dbSubmissions || []);

      // Compute statistics
      if (dbTasks && dbTasks.length > 0) {
        const total = dbTasks.length;
        
        // Find highest score submission per task
        const bestSubmissions: { [key: string]: any } = {};
        (dbSubmissions || []).forEach(sub => {
          if (!bestSubmissions[sub.task_id] || sub.status === 'passed') {
            bestSubmissions[sub.task_id] = sub;
          }
        });

        const completed = Object.values(bestSubmissions).filter((s: any) => s.status === 'passed').length;
        const failed = Object.values(bestSubmissions).filter((s: any) => s.status === 'failed').length;
        const rate = Math.round((completed / total) * 100);

        setStats({ total, completed, failed, rate });
      }

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: prof, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !prof) {
        // Account exists but profile is missing
        await supabase.auth.signOut();
        router.push('/login');
        return;
      }

      setProfile(prof);
      fetchData(session.user);
    }

    checkAuth();
  }, [router]);

  const getTaskStatus = (taskId: string) => {
    const taskSubs = submissions.filter(s => s.task_id === taskId);
    if (taskSubs.length === 0) return 'unattempted';
    
    if (taskSubs.some(s => s.status === 'passed')) return 'passed';
    if (taskSubs.some(s => s.status === 'pending')) return 'pending';
    return 'failed';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-emerald-400" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-rose-400" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-amber-400" />;
      default:
        return <HelpCircle className="h-5 w-5 text-slate-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">Passed</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-400 border border-rose-500/20">Failed</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/20">Pending Review</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded bg-slate-800/80 px-2 py-0.5 text-xs font-medium text-slate-400">Unattempted</span>;
    }
  };

  const getTaskTypeBadge = (type: string) => {
    switch (type) {
      case 'quiz':
        return <span className="inline-flex items-center gap-1 rounded bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/20"><HelpCircle className="h-3 w-3" /> Quiz</span>;
      case 'coding':
        return <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-400 border border-purple-500/20"><Code className="h-3 w-3" /> Code Sandbox</span>;
      case 'cloud_lab':
        return <span className="inline-flex items-center gap-1 rounded bg-pink-500/10 px-2.5 py-0.5 text-xs font-medium text-pink-400 border border-pink-500/20"><Server className="h-3 w-3" /> Cloud Lab</span>;
      default:
        return null;
    }
  };

  // Group tasks by Unit
  const units = [1, 2, 3, 4, 5];
  const getUnitName = (num: number) => {
    switch (num) {
      case 1: return 'Unit I: JDBC and Database Connectivity';
      case 2: return 'Unit II: J2EE Servlets & HTTP Protocol';
      case 3: return 'Unit III: JSP, Directives & Scripting Elements';
      case 4: return 'Unit IV: JSTL & MVC Architecture';
      case 5: return 'Unit V: Spring Framework Core & Aspect Oriented Programming (AOP)';
      default: return `Unit ${num}`;
    }
  };

  if (loading || seeding) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[75vh]">
        <div className="text-center space-y-3">
          <RefreshCw className="h-10 w-10 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm text-slate-400">
            {seeding ? 'Seeding default curriculum syllabus...' : 'Loading student dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Student Welcome & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Welcome message */}
        <div className="lg:col-span-2 glass-card p-6 border border-slate-800 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/5 blur-2xl rounded-full" />
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Welcome back, <span className="text-indigo-400">{profile?.full_name}</span>!
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed font-light">
              Here is your active progress for Advanced Java (CS-302). Run codes, take quizzes, and launch labs to finish modules.
            </p>
          </div>
          <div className="flex items-center gap-4 mt-6 text-xs text-slate-400">
            <div>Roll Number: <span className="text-white font-medium">{profile?.roll_number || 'N/A'}</span></div>
            <div className="h-3 w-px bg-slate-800" />
            <div>Syllabus coverage: <span className="text-indigo-400 font-medium">{stats.rate}%</span></div>
          </div>
        </div>

        {/* Stats card */}
        <div className="lg:col-span-2 grid grid-cols-3 gap-4">
          {/* Passed */}
          <div className="glass-card p-4 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Passed</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl font-extrabold text-emerald-400">{stats.completed}</span>
              <span className="text-xs text-slate-400">/ {stats.total}</span>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-emerald-500/90 font-medium">
              <CheckCircle className="h-3.5 w-3.5" /> Checked
            </div>
          </div>

          {/* Failed */}
          <div className="glass-card p-4 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Failed</span>
            <div className="mt-2">
              <span className="text-3xl font-extrabold text-rose-400">{stats.failed}</span>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-rose-500/90 font-medium">
              <XCircle className="h-3.5 w-3.5" /> Re-runs allowed
            </div>
          </div>

          {/* Progress Circle card */}
          <div className="glass-card p-4 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Completion</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl font-extrabold text-indigo-400">{stats.rate}%</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-900 rounded-full h-1.5 mt-4 overflow-hidden border border-slate-800">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full" 
                style={{ width: `${stats.rate}%` }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Syllabus Modules Accordion/List */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-400" /> Advanced Java Syllabus Units
        </h3>

        {units.map((unitNum) => {
          const unitTasks = tasks.filter(t => t.unit_number === unitNum);
          
          if (unitTasks.length === 0) return null;

          return (
            <div key={unitNum} className="glass-card border border-slate-800 overflow-hidden shadow-lg">
              {/* Unit Header */}
              <div className="bg-slate-900/40 border-b border-slate-800 px-6 py-4">
                <h4 className="text-sm font-bold text-white tracking-wide uppercase">
                  {getUnitName(unitNum)}
                </h4>
              </div>

              {/* Tasks List */}
              <div className="divide-y divide-slate-800/80">
                {unitTasks.map((task) => {
                  const status = getTaskStatus(task.id);
                  return (
                    <Link 
                      key={task.id}
                      href={`/practice/${task.id}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-6 hover:bg-slate-900/20 transition-all group gap-4 cursor-pointer"
                    >
                      <div className="space-y-1.5 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-white font-semibold text-base group-hover:text-indigo-400 transition-colors">
                            {task.title}
                          </span>
                          {getTaskTypeBadge(task.type)}
                        </div>
                        <p className="text-xs text-slate-400 font-light leading-relaxed">
                          {task.description}
                        </p>
                      </div>

                      {/* Status and Action */}
                      <div className="flex items-center gap-4 justify-between sm:justify-end">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(status)}
                          {getStatusBadge(status)}
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
