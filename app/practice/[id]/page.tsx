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

  const fetchTaskAndSubmissions = async (userProfile: any, targetId: string) => {
    try {
      setLoading(true);

      // Fetch task details
      const { data: dbTask, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', targetId)
        .single();

      if (taskError || !dbTask) throw new Error('Task not found');

      // Enforce year and section security boundaries
      const studentYear = userProfile.year || 3;
      if (dbTask.year !== studentYear) {
        throw new Error('Access denied: target student year mismatch.');
      }
      if (studentYear === 2) {
        const studentSection = userProfile.section || 'A';
        if (dbTask.section && dbTask.section !== 'All' && dbTask.section !== studentSection) {
          throw new Error('Access denied: target student section mismatch.');
        }
      }

      setTask(dbTask);

      // Fetch user's submissions for this task (excluding runs)
      const { data: dbSubs, error: subsError } = await supabase
        .from('submissions')
        .select('*')
        .eq('student_id', userProfile.id)
        .eq('task_id', targetId)
        .eq('is_run', false)
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
    fetchTaskAndSubmissions(session, taskId);
  }, [taskId, router]);

  const onTaskSubmitted = () => {
    if (profile && taskId) {
      // Re-fetch submissions list to update sidebar records (excluding runs)
      supabase
        .from('submissions')
        .select('*')
        .eq('student_id', profile.id)
        .eq('task_id', taskId)
        .eq('is_run', false)
        .order('submitted_at', { ascending: false })
        .then(({ data }) => {
          if (data) setSubmissions(data);
        });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-rose-500" />;
      default:
        return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'quiz':
        return <HelpCircle className="h-5 w-5 text-indigo-500" />;
      case 'coding':
        return <Code className="h-5 w-5 text-violet-500" />;
      case 'cloud_lab':
        return <Server className="h-5 w-5 text-sky-500" />;
      default:
        return null;
    }
  };

  if (loading || !task) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[75vh] bg-slate-50">
        <div className="text-center space-y-4">
          <div className="relative mx-auto h-12 w-12">
            <div className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-30" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md border border-slate-200">
              <RefreshCw className="h-5 w-5 text-indigo-500 animate-spin" />
            </div>
          </div>
          <p className="text-sm text-slate-500 font-medium">Loading exercise workspace…</p>
        </div>
      </div>
    );
  }

  const taskTypeLabel = task.type.replace('_', ' ');
  const taskTypeBgColor =
    task.type === 'quiz'
      ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
      : task.type === 'coding'
        ? 'bg-violet-50 text-violet-600 border-violet-200'
        : 'bg-sky-50 text-sky-600 border-sky-200';

  const hasPassed = submissions.length > 0 && submissions.some(s => s.status === 'passed');

  return (
    <div className="flex-1 w-full min-h-screen bg-slate-50">

      {/* Top Header Bar */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">

          {/* Left: Back + Title */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard"
              className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-700 hover:shadow transition-all duration-150 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Unit {task.unit_number}
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${taskTypeBgColor}`}>
                  {getTaskIcon(task.type)}
                  {taskTypeLabel}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate mt-0.5">
                {task.title}
              </h1>
            </div>
          </div>

          {/* Right: Completion Badge */}
          {hasPassed && (
            <div className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-600 border border-emerald-200 shadow-sm">
              <Award className="h-4 w-4" />
              <span className="hidden sm:inline">Task Completed</span>
              <span className="sm:hidden">Done</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col xl:flex-row gap-6 items-start">

          {/* ─── Sidebar: resizable on desktop ─── */}
          <aside
            className="w-full xl:w-[340px] xl:min-w-[260px] xl:max-w-[520px] xl:resize-x xl:overflow-auto flex-shrink-0 space-y-5"
          >

            {/* ── Problem Statement Card ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-slate-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Problem Statement
                </h3>
              </div>
              <div className="px-5 py-4 max-h-[320px] overflow-y-auto">
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>
            </div>

            {/* ── Test Cases Card ── */}
            {task.type === 'coding' && task.metadata?.testCases && task.metadata.testCases.filter((tc: any) => !tc.isHidden).length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Test Cases
                  </h4>
                </div>
                <div className="px-5 py-4 space-y-3 max-h-[300px] overflow-y-auto">
                  {task.metadata.testCases
                    .filter((tc: any) => !tc.isHidden)
                    .map((tc: any, idx: number) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2"
                      >
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                          Test Case #{idx + 1}
                        </span>
                        <div className="space-y-1 font-mono text-xs">
                          <div className="flex gap-2">
                            <span className="text-slate-400 flex-shrink-0">Input:</span>
                            <code className="text-slate-700 break-all">{tc.input || '(empty)'}</code>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-slate-400 flex-shrink-0">Expected:</span>
                            <code className="text-emerald-600 font-semibold break-all">{tc.expected}</code>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* ── Submission Logs Card ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Submission Logs
                </h3>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                  {submissions.length}
                </span>
              </div>
              <div className="px-5 py-4">
                {submissions.length > 0 ? (
                  <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                    {submissions.map((sub) => {
                      const statusBg =
                        sub.status === 'passed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : sub.status === 'failed'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200';

                      return (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs transition-colors hover:bg-white"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {getStatusIcon(sub.status)}
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusBg}`}>
                                {sub.status}
                              </span>
                            </div>
                            <span className="block text-[10px] text-slate-400">
                              {new Date(sub.submitted_at).toLocaleDateString()} at{' '}
                              {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <span className="flex-shrink-0 text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">
                            {sub.score}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    No submission attempts recorded for this exercise yet.
                  </p>
                )}
              </div>
            </div>
          </aside>

          {/* ─── Workspace Area ─── */}
          <div className="flex-1 min-w-0">
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
    </div>
  );
}
