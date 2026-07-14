'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getCurrentSession } from '@/lib/supabase';
import WorkspaceQuiz from '@/components/workspace-quiz';
import WorkspaceCoding from '@/components/workspace-coding';
import WorkspaceCloudLab from '@/components/workspace-cloudlab';
import { 
  ArrowLeft, BookOpen, RefreshCw, Clock, CheckCircle, 
  XCircle, HelpCircle, Code, Server, Award 
} from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PracticePage({ params }: PageProps) {
  const router = useRouter();
  const [taskId, setTaskId] = useState<string | null>(null);
  
  // Auth state
  const [profile, setProfile] = useState<any>(null);

  // App data states
  const [task, setTask] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Resolve params
  useEffect(() => {
    params.then(p => setTaskId(p.id));
  }, [params]);

  const fetchTaskAndSubmissions = async (userId: string, targetId: string) => {
    try {
      setLoading(true);

      // Fetch task details
      const { data: dbTask, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', targetId)
        .single();

      if (taskError || !dbTask) throw new Error('Task not found');
      setTask(dbTask);

      // Fetch user's submissions for this task
      const { data: dbSubs, error: subsError } = await supabase
        .from('submissions')
        .select('*')
        .eq('student_id', userId)
        .eq('task_id', targetId)
        .order('submitted_at', { ascending: false });

      if (subsError) throw subsError;
      setSubmissions(dbSubs || []);

    } catch (err: any) {
      console.error('Error fetching practice data:', err.message);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!taskId) return;

    // Check custom table-based session
    const session = getCurrentSession();
    if (!session) {
      router.push('/login');
      return;
    }

    setProfile(session);
    fetchTaskAndSubmissions(session.id, taskId);
  }, [taskId, router]);

  const onTaskSubmitted = () => {
    if (profile && taskId) {
      // Re-fetch submissions list to update sidebar records
      supabase
        .from('submissions')
        .select('*')
        .eq('student_id', profile.id)
        .eq('task_id', taskId)
        .order('submitted_at', { ascending: false })
        .then(({ data }) => {
          if (data) setSubmissions(data);
        });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-rose-400" />;
      default:
        return <Clock className="h-4 w-4 text-amber-400" />;
    }
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'quiz':
        return <HelpCircle className="h-5 w-5 text-indigo-400" />;
      case 'coding':
        return <Code className="h-5 w-5 text-purple-400" />;
      case 'cloud_lab':
        return <Server className="h-5 w-5 text-pink-400" />;
      default:
        return null;
    }
  };

  if (loading || !task) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[75vh]">
        <div className="text-center space-y-3">
          <RefreshCw className="h-10 w-10 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Loading exercise workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
      
      {/* Back button and title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Unit {task.unit_number} Exercise</span>
              <span className="h-1 w-1 rounded-full bg-slate-700" />
              <span className="text-xs font-semibold text-indigo-400 uppercase">{task.type.replace('_', ' ')}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 mt-1">
              {getTaskIcon(task.type)}
              {task.title}
            </h1>
          </div>
        </div>
        
        {submissions.length > 0 && submissions.some(s => s.status === 'passed') && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20 shadow-md">
            <Award className="h-4.5 w-4.5" />
            Unit Task Completed
          </div>
        )}
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
        
        {/* Sidebar Info - Left Panel */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* Details Card */}
          <div className="glass-card p-5 border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Problem Statement</h3>
            <p className="text-xs text-slate-300 font-light leading-relaxed whitespace-pre-wrap">
              {task.description}
            </p>

            {task.type === 'coding' && task.metadata?.testCases && task.metadata.testCases.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-900 space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Scheduled Test Cases</h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {task.metadata.testCases.map((tc: any, idx: number) => (
                    <div key={idx} className="text-[10px] bg-slate-950/50 p-2 rounded border border-slate-900/60 font-mono space-y-0.5">
                      <span className="text-indigo-400 font-bold block uppercase text-[8px]">Test Case #{idx + 1}</span>
                      <div><span className="text-slate-500">Input (stdin):</span> <code className="text-slate-300">{tc.input || '(empty)'}</code></div>
                      <div><span className="text-slate-500">Expected:</span> <code className="text-emerald-400">{tc.expected}</code></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submissions Log Card */}
          <div className="glass-card p-5 border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Submission Logs ({submissions.length})</h3>
            {submissions.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {submissions.map((sub) => (
                  <div 
                    key={sub.id} 
                    className="p-3 bg-slate-950/50 border border-slate-900 rounded-lg flex items-center justify-between text-xs transition-all hover:bg-slate-950"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-medium">
                        {getStatusIcon(sub.status)}
                        <span className="text-white capitalize">{sub.status}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(sub.submitted_at).toLocaleDateString()} at {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className="font-semibold text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      Score: {sub.score}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-light italic">No submission attempts recorded for this exercise yet.</p>
            )}
          </div>
        </div>

        {/* Workspace Card - Right Panel */}
        <div className="xl:col-span-3">
          {task.type === 'quiz' && (
            <WorkspaceQuiz task={task} studentId={profile.id} submissions={submissions} onSubmitted={onTaskSubmitted} />
          )}
          {task.type === 'coding' && (
            <WorkspaceCoding task={task} studentId={profile.id} onSubmitted={onTaskSubmitted} />
          )}
          {task.type === 'cloud_lab' && (
            <WorkspaceCloudLab task={task} studentId={profile.id} onSubmitted={onTaskSubmitted} />
          )}
        </div>

      </div>

    </div>
  );
}
