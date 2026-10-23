'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getCurrentSession, updateLocalSession } from '@/lib/supabase';
import { isTaskAssignedToStudent } from '@/lib/task-assignment';
import { 
  Award, CheckCircle, Clock, XCircle, Code, HelpCircle, Server, 
  BookOpen, ChevronRight, BarChart3, Star, RefreshCw, Key, ShieldAlert 
} from 'lucide-react';

const units = [1, 2, 3, 4, 5];

export default function StudentDashboard() {
  const router = useRouter();
  
  // Auth state
  const [profile, setProfile] = useState<any>(null);
  
  // First login password reset states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passError, setPassError] = useState('');

  // App data states
  const [tasks, setTasks] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    rate: 0,
    quizScore: 0,
    codingScore: 0
  });

  const fetchData = async (userProfile: any) => {
    try {
      setLoading(true);

      // Fetch fresh profile from database to get latest quiz and program grades
      const { data: dbProfile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userProfile.id)
        .single();
      
      if (!profileErr && dbProfile) {
        setProfile(dbProfile);
      }

      // Fetch Tasks
      const { data: dbTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('unit_number', { ascending: true })
        .order('title', { ascending: true });

      if (tasksError) throw tasksError;

      // Filter tasks by the student's Year of Study and Section (1st Year CAI/CSD, 2nd Year, 3rd Year)
      const yearTasks = (dbTasks || []).filter(t => isTaskAssignedToStudent(t, userProfile));
      setTasks(yearTasks);

      // Fetch Submissions for this student (excluding runs)
      const { data: dbSubmissions, error: subError } = await supabase
        .from('submissions')
        .select('*')
        .eq('student_id', userProfile.id)
        .eq('is_run', false);

      if (subError) throw subError;
      setSubmissions(dbSubmissions || []);

      // Compute statistics for the filtered year tasks
      if (yearTasks.length > 0) {
        const total = yearTasks.length;
        const activeTaskIds = yearTasks.map(t => t.id);
        const filteredSubs = (dbSubmissions || []).filter(s => activeTaskIds.includes(s.task_id));
        
        // Find highest score submission per task
        const bestSubmissions: { [key: string]: any } = {};
        filteredSubs.forEach(sub => {
          if (!bestSubmissions[sub.task_id] || sub.status === 'passed') {
            bestSubmissions[sub.task_id] = sub;
          }
        });

        const completed = Object.values(bestSubmissions).filter((s: any) => s.status === 'passed').length;
        const failed = Object.values(bestSubmissions).filter((s: any) => s.status === 'failed').length;
        const rate = Math.round((completed / total) * 100);

        const now = new Date();

        // Calculate Quiz Score
        const scheduledQuizzes = yearTasks.filter(t => {
          if (t.type !== 'quiz') return false;
          return !t.start_time || new Date(t.start_time) <= now;
        });
        const attemptedQuizzes = scheduledQuizzes.filter(t => !!bestSubmissions[t.id]);
        const attemptedQuizCount = attemptedQuizzes.length;
        const missedQuizCount = scheduledQuizzes.length - attemptedQuizCount;

        let calculatedQuizScore = 0;
        if (attemptedQuizCount > 0) {
          const totalQuizScoreSum = attemptedQuizzes.reduce((sum, t) => sum + (bestSubmissions[t.id].score || 0), 0);
          const averageQuizPercent = totalQuizScoreSum / attemptedQuizCount;
          calculatedQuizScore = Math.max(0, (averageQuizPercent / 10) - missedQuizCount);
        }

        // Calculate Coding Score
        const scheduledCoding = yearTasks.filter(t => {
          if (t.type !== 'coding') return false;
          return !t.start_time || new Date(t.start_time) <= now;
        });
        const attemptedCoding = scheduledCoding.filter(t => !!bestSubmissions[t.id]);
        const attemptedCodingCount = attemptedCoding.length;

        let calculatedCodingScore = 0;
        if (attemptedCodingCount > 0) {
          const totalCodingScoreSum = attemptedCoding.reduce((sum, t) => sum + (bestSubmissions[t.id].score || 0), 0);
          const averageCodingPercent = totalCodingScoreSum / attemptedCodingCount;
          calculatedCodingScore = averageCodingPercent / 10;
        }

        // Merge with database profile score (handles wiped tasks)
        const finalQuizScore = Math.max(Number(dbProfile?.overall_quiz_score || 0), calculatedQuizScore);
        const finalCodingScore = Math.max(Number(dbProfile?.overall_coding_score || 0), calculatedCodingScore);

        setStats({ 
          total, 
          completed, 
          failed, 
          rate,
          quizScore: finalQuizScore,
          codingScore: finalCodingScore
        });
      } else {
        setStats({ 
          total: 0, 
          completed: 0, 
          failed: 0, 
          rate: 0,
          quizScore: Number(dbProfile?.overall_quiz_score || 0),
          codingScore: Number(dbProfile?.overall_coding_score || 0)
        });
      }

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const session = getCurrentSession();
    if (!session) {
      router.push('/login');
      return;
    }

    if (session.role === 'faculty') {
      router.push('/admin');
      return;
    }

    setProfile(session);
    fetchData(session);
  }, [router]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');

    if (newPassword.length < 5) {
      setPassError('Password must be at least 5 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('Passwords do not match.');
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          password: newPassword,
          first_login: false
        })
        .eq('id', profile.id);

      if (error) throw error;

      const updatedProfile = { ...profile, first_login: false, password: newPassword };
      updateLocalSession(updatedProfile);
      setProfile(updatedProfile);
    } catch (err: any) {
      setPassError(err.message || 'Failed to update password.');
    } finally {
      setChangingPassword(false);
    }
  };

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
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-rose-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-amber-500" />;
      default:
        return <HelpCircle className="h-5 w-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return <span className="inline-flex items-center gap-1 rounded-full bg-green-900/50 px-2.5 py-0.5 text-xs font-semibold text-green-300 border border-green-500/40">Passed</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1 rounded-full bg-rose-900/50 px-2.5 py-0.5 text-xs font-semibold text-rose-300 border border-rose-500/40">Failed</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/50 px-2.5 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/40">Pending Review</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/50 px-2.5 py-0.5 text-xs font-semibold text-slate-400 border border-slate-600/40">Unattempted</span>;
    }
  };

  const getTaskTypeBadge = (type: string) => {
    switch (type) {
      case 'quiz':
        return <span className="inline-flex items-center gap-1 rounded-full bg-indigo-900/50 px-2.5 py-0.5 text-xs font-semibold text-indigo-300 border border-indigo-500/30"><HelpCircle className="h-3 w-3" /> Quiz</span>;
      case 'coding':
        return <span className="inline-flex items-center gap-1 rounded-full bg-green-900/50 px-2.5 py-0.5 text-xs font-semibold text-green-300 border border-green-500/30"><Code className="h-3 w-3" /> Code Sandbox</span>;
      case 'cloud_lab':
        return <span className="inline-flex items-center gap-1 rounded-full bg-pink-900/50 px-2.5 py-0.5 text-xs font-semibold text-pink-300 border border-pink-500/30"><Server className="h-3 w-3" /> Cloud Lab</span>;
      default:
        return null;
    }
  };

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

  // Filter for active scheduled mandatory tasks (start_time <= now <= end_time)
  const getActiveMandatoryTasks = () => {
    const now = new Date();
    return tasks.filter(t => {
      if (!t.start_time || !t.end_time) return false;
      const start = new Date(t.start_time);
      const end = new Date(t.end_time);
      return now >= start && now <= end;
    });
  };

  // ─── Loading State ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#090e1a] flex items-center justify-center z-50">
        <div className="text-center space-y-6">
          {/* Terminal window chrome */}
          <div className="w-80 bg-[#0d1b2a] border border-[#1e3a5f]/70 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
            <div className="flex items-center gap-2 px-4 py-3 bg-[#0a1628] border-b border-[#1e3a5f]/50">
              <div className="h-3 w-3 rounded-full bg-rose-500/80" />
              <div className="h-3 w-3 rounded-full bg-amber-500/80" />
              <div className="h-3 w-3 rounded-full bg-[#00ff88]/80" />
              <span className="ml-2 text-[11px] text-slate-500 font-mono">terminal — bash</span>
            </div>
            <div className="p-5 font-mono text-sm text-left space-y-2">
              <p className="text-slate-500 text-xs"># C &amp; DS Practice Portal v2.0</p>
              <div className="flex items-center gap-2">
                <span className="text-[#00ff88]">$</span>
                <span className="text-slate-300">&gt; Loading your workspace</span>
                <span className="inline-block w-2 h-4 bg-[#00ff88] animate-[blink_1s_ease-in-out_infinite]" />
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <span className="text-[#00ff88] animate-pulse">●</span>
                <span>Connecting to database...</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <span className="text-[#00d4ff] animate-pulse" style={{ animationDelay: '0.3s' }}>●</span>
                <span>Fetching task assignments...</span>
              </div>
            </div>
          </div>
          <p className="text-[#00ff88]/60 text-xs font-mono tracking-widest animate-pulse">INITIALIZING...</p>
        </div>
        <style>{`
          @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
          @keyframes glow-pulse { 0%,100%{box-shadow:0 0 8px rgba(0,255,136,0.3)} 50%{box-shadow:0 0 24px rgba(0,255,136,0.7)} }
          @keyframes float { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-6px)} }
          @keyframes neon-flicker { 0%,19%,21%,23%,25%,54%,56%,100%{opacity:1} 20%,24%,55%{opacity:0.4} }
        `}</style>
      </div>
    );
  }

  // ─── First-Login Password Modal ──────────────────────────────────────────────
  if (profile?.first_login) {
    return (
      <div className="fixed inset-0 z-50 bg-[#090e1a]/98 backdrop-blur-sm flex items-center justify-center p-4">
        {/* Background glow orbs */}
        <div className="absolute top-1/4 left-1/4 h-64 w-64 bg-[#00ff88]/5 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 h-48 w-48 bg-[#00d4ff]/5 blur-3xl rounded-full pointer-events-none" />

        <div className="w-full max-w-md bg-[#0d1b2a]/95 rounded-2xl border border-[#1e3a5f]/60 backdrop-blur-xl shadow-2xl shadow-black/60 relative overflow-hidden">
          {/* Neon top border accent */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00ff88]/60 to-transparent" />
          {/* Background orbs inside modal */}
          <div className="absolute -top-16 -left-16 h-40 w-40 bg-[#00ff88]/5 blur-3xl rounded-full" />
          <div className="absolute -bottom-12 -right-12 h-32 w-32 bg-[#00d4ff]/5 blur-3xl rounded-full" />

          <div className="relative p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col items-center text-center">
              <div
                className="h-16 w-16 rounded-2xl bg-[#0a1628] border border-[#00ff88]/30 flex items-center justify-center text-[#00ff88] mb-5 shadow-lg"
                style={{ boxShadow: '0 0 20px rgba(0,255,136,0.2)' }}
              >
                <Key className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-white">Secure Your Account</h2>
              <p className="text-sm text-slate-400 leading-relaxed mt-2 max-w-[300px]">
                First login detected. Set a new password to access your C &amp; DS workspace.
              </p>
              <div className="mt-3 font-mono text-xs text-[#00ff88]/70 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00ff88] animate-pulse" />
                <span>&gt; security_protocol: active</span>
              </div>
            </div>

            {/* Error */}
            {passError && (
              <div className="rounded-xl bg-rose-900/30 border border-rose-500/40 p-4 text-sm text-rose-300 flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0 text-rose-400" />
                <span>{passError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                  <span className="text-[#00ff88]">$</span> new_password
                </label>
                <input
                  type="password"
                  required
                  placeholder="At least 5 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#1e3a5f]/80 bg-[#090e1a]/80 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00ff88]/25 focus:border-[#00ff88]/50 transition-all font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                  <span className="text-[#00ff88]">$</span> confirm_password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Re-type password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#1e3a5f]/80 bg-[#090e1a]/80 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00ff88]/25 focus:border-[#00ff88]/50 transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-[#090e1a] transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  background: changingPassword
                    ? 'rgba(0,255,136,0.4)'
                    : 'linear-gradient(135deg, #00ff88 0%, #00d4ff 100%)',
                  boxShadow: changingPassword ? 'none' : '0 0 20px rgba(0,255,136,0.3)',
                }}
              >
                {changingPassword ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Encrypting...
                  </>
                ) : (
                  'Confirm & Enter Lab →'
                )}
              </button>
            </form>
          </div>
        </div>

        <style>{`
          @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
          @keyframes glow-pulse { 0%,100%{box-shadow:0 0 8px rgba(0,255,136,0.3)} 50%{box-shadow:0 0 24px rgba(0,255,136,0.7)} }
          @keyframes float { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-6px)} }
        `}</style>
      </div>
    );
  }

  const activeMandatory = getActiveMandatoryTasks();
  const isFirstYear = profile?.roll_number?.toUpperCase().startsWith('26FE') || profile?.year === 1;
  const section = profile?.roll_number?.toUpperCase().includes('43') ? 'CAI' : 'CSD';
  const firstName = profile?.full_name?.split(' ')[0] || profile?.full_name || 'Student';

  return (
    <div className="flex-1 w-full bg-[#090e1a] min-h-screen">
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes glow-pulse {
          0%,100%{box-shadow:0 0 8px rgba(0,255,136,0.2), 0 0 0px rgba(0,255,136,0)}
          50%{box-shadow:0 0 24px rgba(0,255,136,0.5), 0 0 48px rgba(0,255,136,0.1)}
        }
        @keyframes float { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-8px)} }
        @keyframes scan-line {
          0%{transform:translateY(-100%)} 100%{transform:translateY(400%)}
        }
        @keyframes neon-border {
          0%,100%{border-color:rgba(0,255,136,0.2)} 50%{border-color:rgba(0,255,136,0.5)}
        }
        .cursor-blink { animation: blink 1s ease-in-out infinite; }
        .stat-glow-green { filter: drop-shadow(0 0 8px rgba(0,255,136,0.6)); }
        .stat-glow-cyan { filter: drop-shadow(0 0 8px rgba(0,212,255,0.6)); }
        .stat-glow-amber { filter: drop-shadow(0 0 8px rgba(251,191,36,0.5)); }
        .stat-glow-violet { filter: drop-shadow(0 0 8px rgba(167,139,250,0.5)); }
        .stat-glow-rose { filter: drop-shadow(0 0 8px rgba(251,113,133,0.5)); }
      `}</style>

      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Hero Welcome Banner ─────────────────────────────────────────────── */}
        <div className="relative bg-[#0d1b2a] border border-[#1e3a5f]/50 rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
          {/* Neon top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00ff88]/50 to-transparent" />

          {/* Background glow orbs */}
          <div className="absolute -top-16 -right-16 h-48 w-48 bg-[#00ff88]/6 blur-3xl rounded-full pointer-events-none" style={{ animation: 'float 6s ease-in-out infinite' }} />
          <div className="absolute -bottom-12 -left-12 h-36 w-36 bg-[#00d4ff]/5 blur-3xl rounded-full pointer-events-none" style={{ animation: 'float 8s ease-in-out infinite reverse' }} />
          <div className="absolute top-1/2 left-1/3 h-24 w-24 bg-violet-500/4 blur-2xl rounded-full pointer-events-none" />

          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Left: Welcome info */}
            <div className="p-7 lg:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#1e3a5f]/40">
              <div>
                {/* Status indicator */}
                <div className="flex items-center gap-2 mb-5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff88] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00ff88]" />
                  </span>
                  <span className="text-xs font-mono text-[#00ff88]/80 uppercase tracking-widest">Session Active</span>
                </div>

                {/* Terminal prompt line */}
                <div className="font-mono text-sm text-[#00ff88]/70 mb-3 flex items-center gap-1">
                  <span className="text-slate-600">$</span>
                  <span>&gt; Welcome to C Programming Lab, <span className="text-[#00ff88]">{firstName}</span></span>
                  <span className="cursor-blink inline-block w-2 h-4 bg-[#00ff88]/80 ml-0.5" />
                </div>

                {/* Main greeting */}
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 leading-tight">
                  Hello,{' '}
                  <span
                    className="bg-gradient-to-r from-[#00ff88] to-[#00d4ff] bg-clip-text text-transparent"
                    style={{ filter: 'drop-shadow(0 0 12px rgba(0,255,136,0.3))' }}
                  >
                    {profile?.full_name}
                  </span>
                  !
                </h2>

                <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
                  {isFirstYear
                    ? 'Master C Programming & Data Structures exercises scheduled by your faculty. Verify outputs inside the live compiler.'
                    : 'Master Java exercises scheduled by your faculty administrator. Verify outputs inside code environments.'}
                </p>
              </div>

              {/* Meta info strip */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-6 pt-5 border-t border-[#1e3a5f]/50 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <BookOpen className="h-3.5 w-3.5 text-slate-600" />
                  <span>Roll:</span>
                  <span className="text-slate-200 font-semibold">{profile?.roll_number || 'N/A'}</span>
                </div>
                <div className="h-3.5 w-px bg-[#1e3a5f]" />
                <div
                  className="text-[#00ff88] font-semibold"
                  style={{ textShadow: '0 0 10px rgba(0,255,136,0.4)' }}
                >
                  {isFirstYear
                    ? `1st Year (${section}) · C & DS`
                    : profile?.year === 2
                      ? `2nd Year (${profile?.section || 'A'}) · Java`
                      : '3rd Year · Advanced Java'}
                </div>
              </div>
            </div>

            {/* Right: Animated C code snippet */}
            <div className="p-7 lg:p-8 flex items-center justify-center">
              <div className="w-full max-w-xs">
                {/* Code window chrome */}
                <div className="bg-[#090e1a] border border-[#1e3a5f]/60 rounded-xl overflow-hidden shadow-xl">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0a1628] border-b border-[#1e3a5f]/50">
                    <div className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#00ff88]/70" />
                    <span className="ml-2 text-[10px] text-slate-600 font-mono">linked_list.c</span>
                  </div>
                  <div className="p-4 font-mono text-xs leading-6 relative overflow-hidden">
                    {/* Scan line effect */}
                    <div
                      className="absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-[#00ff88]/3 to-transparent pointer-events-none"
                      style={{ animation: 'scan-line 4s linear infinite' }}
                    />
                    <div className="text-slate-600">{`// Data Structure`}</div>
                    <div><span className="text-violet-400">struct</span> <span className="text-[#00d4ff]">Node</span> <span className="text-slate-300">{'{'}</span></div>
                    <div className="pl-4">
                      <span className="text-violet-400">int</span>
                      <span className="text-slate-300"> data</span>
                      <span className="text-slate-500">;</span>
                    </div>
                    <div className="pl-4">
                      <span className="text-violet-400">struct</span>
                      <span className="text-[#00d4ff]"> Node</span>
                      <span className="text-[#00ff88]"> *next</span>
                      <span className="text-slate-500">;</span>
                    </div>
                    <div><span className="text-slate-300">{'}'}</span><span className="text-slate-500">;</span></div>
                    <div className="mt-2 text-slate-600">{`// malloc → link → traverse`}</div>
                    <div className="flex items-center">
                      <span className="text-slate-600">_</span>
                      <span className="cursor-blink inline-block w-1.5 h-3.5 bg-[#00ff88] ml-0.5" />
                    </div>
                  </div>
                </div>
                <p className="text-center text-[10px] text-slate-600 font-mono mt-2 tracking-wider">C PROGRAMMING · DATA STRUCTURES</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats Cards Row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">

          {/* Passed */}
          <div
            className="group bg-[#0d1b2a] border border-[#1e3a5f]/50 rounded-xl p-4 flex flex-col justify-between cursor-default transition-all duration-300 hover:border-[#00ff88]/40"
            style={{ transition: 'all 0.3s' }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 20px rgba(0,255,136,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 font-mono">Passed</span>
              <div className="h-8 w-8 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-[#00ff88]" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 mt-4">
              <span className="text-3xl font-extrabold text-[#00ff88] stat-glow-green">{stats.completed}</span>
              <span className="text-sm text-slate-600 font-mono">/ {stats.total}</span>
            </div>
            <div className="mt-2 text-[10px] text-[#00ff88]/60 font-mono tracking-wide">tasks_cleared</div>
          </div>

          {/* Failed */}
          <div
            className="group bg-[#0d1b2a] border border-[#1e3a5f]/50 rounded-xl p-4 flex flex-col justify-between cursor-default transition-all duration-300 hover:border-rose-500/30"
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 20px rgba(251,113,133,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 font-mono">Failed</span>
              <div className="h-8 w-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <XCircle className="h-4 w-4 text-rose-400" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-rose-400 stat-glow-rose">{stats.failed}</span>
            </div>
            <div className="mt-2 text-[10px] text-rose-400/60 font-mono tracking-wide">re_runs_allowed</div>
          </div>

          {/* Completion */}
          <div
            className="group bg-[#0d1b2a] border border-[#1e3a5f]/50 rounded-xl p-4 flex flex-col justify-between cursor-default transition-all duration-300 hover:border-[#00d4ff]/40"
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 20px rgba(0,212,255,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 font-mono">Completion</span>
              <div className="h-8 w-8 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-[#00d4ff]" />
              </div>
            </div>
            <div className="flex items-baseline gap-0.5 mt-4">
              <span className="text-3xl font-extrabold text-[#00d4ff] stat-glow-cyan">{stats.rate}</span>
              <span className="text-lg font-bold text-[#00d4ff]/50">%</span>
            </div>
            {/* Neon progress bar */}
            <div className="w-full bg-[#0a1628] rounded-full h-1.5 mt-3 overflow-hidden border border-[#1e3a5f]/40">
              <div
                className="h-1.5 rounded-full transition-all duration-700"
                style={{
                  width: `${stats.rate}%`,
                  background: 'linear-gradient(90deg, #00ff88, #00d4ff)',
                  boxShadow: '0 0 8px rgba(0,212,255,0.6)',
                }}
              />
            </div>
          </div>

          {/* Quiz Grade */}
          <div
            className="group bg-[#0d1b2a] border border-[#1e3a5f]/50 rounded-xl p-4 flex flex-col justify-between cursor-default transition-all duration-300 hover:border-amber-500/30"
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 20px rgba(251,191,36,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 font-mono">Quiz Grade</span>
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Award className="h-4 w-4 text-amber-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-1 mt-4">
              <span className="text-3xl font-extrabold text-amber-400 stat-glow-amber">{stats.quizScore.toFixed(1)}</span>
              <span className="text-sm text-slate-600 font-mono">/ 10</span>
            </div>
            <div className="mt-2 text-[10px] text-amber-400/60 font-mono tracking-wide">avg_−_penalty</div>
          </div>

          {/* Coding Grade */}
          <div
            className="group bg-[#0d1b2a] border border-[#1e3a5f]/50 rounded-xl p-4 flex flex-col justify-between cursor-default transition-all duration-300 hover:border-violet-500/30"
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 20px rgba(167,139,250,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 font-mono">Coding Grade</span>
              <div className="h-8 w-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Code className="h-4 w-4 text-violet-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-1 mt-4">
              <span className="text-3xl font-extrabold text-violet-400 stat-glow-violet">{stats.codingScore.toFixed(1)}</span>
              <span className="text-sm text-slate-600 font-mono">/ 10</span>
            </div>
            <div className="mt-2 text-[10px] text-violet-400/60 font-mono tracking-wide">program_avg</div>
          </div>
        </div>

        {/* ── Today's Mandatory Tasks ─────────────────────────────────────────── */}
        <div className="relative bg-[#0d1b2a] border border-[#1e3a5f]/50 rounded-2xl overflow-hidden shadow-xl shadow-black/30">
          {/* Neon top accent */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00ff88]/30 to-transparent" />
          {/* Background glow */}
          <div className="absolute top-0 right-0 h-48 w-48 bg-[#00ff88]/4 blur-3xl rounded-full pointer-events-none" />

          <div className="relative p-6">
            {/* Section header */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div
                className="h-10 w-10 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/25 flex items-center justify-center"
                style={{ boxShadow: '0 0 12px rgba(0,255,136,0.1)' }}
              >
                <Star className="h-5 w-5 text-[#00ff88]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-white">Today&apos;s Mandatory Tasks</h3>
                <p className="text-xs text-slate-500 font-mono">&gt; Active scheduled exercises you need to complete</p>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2 bg-[#00ff88]/8 border border-[#00ff88]/20 rounded-full px-3 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff88] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff88]" />
                </span>
                <span className="text-xs font-semibold text-[#00ff88] font-mono">{activeMandatory.length} Active</span>
              </div>
            </div>

            {/* Task grid or empty state */}
            {activeMandatory.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeMandatory.map(task => {
                  const status = getTaskStatus(task.id);
                  const isPassed = status === 'passed';
                  const endFormatted = new Date(task.end_time).toLocaleString([], {
                    hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric'
                  });

                  return (
                    <Link
                      key={task.id}
                      href={`/practice/${task.id}`}
                      className={`group relative p-5 rounded-xl border transition-all duration-300 flex flex-col justify-between gap-4 cursor-pointer hover:scale-[1.01] overflow-hidden ${
                        isPassed
                          ? 'border-green-500/40 bg-green-900/10'
                          : 'border-[#1e3a5f]/60 bg-[#090e1a]/60 hover:border-[#00ff88]/30'
                      }`}
                      style={isPassed
                        ? { boxShadow: '0 0 20px rgba(0,255,136,0.08)' }
                        : undefined
                      }
                      onMouseEnter={e => {
                        if (!isPassed) (e.currentTarget as HTMLElement).style.boxShadow = '0 0 24px rgba(0,255,136,0.15)';
                      }}
                      onMouseLeave={e => {
                        if (!isPassed) (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                      }}
                    >
                      {/* Passed glow accent */}
                      {isPassed && (
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-400/40 to-transparent" />
                      )}

                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          {getTaskTypeBadge(task.type)}
                          {getStatusBadge(status)}
                        </div>
                        <h4
                          className={`text-sm sm:text-base font-bold leading-snug transition-colors ${
                            isPassed ? 'text-green-300' : 'text-white group-hover:text-[#00ff88]'
                          }`}
                        >
                          {task.title}
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{task.description}</p>
                      </div>

                      <div className="flex items-center justify-between border-t border-[#1e3a5f]/40 pt-3 mt-1 text-[11px]">
                        <span className="text-slate-600 flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3 text-slate-600" />
                          Until: <strong className="text-slate-400 font-semibold ml-1">{endFormatted}</strong>
                        </span>
                        <span
                          className={`font-bold uppercase tracking-wider text-xs flex items-center gap-1 font-mono transition-all ${
                            isPassed
                              ? 'text-green-400'
                              : 'text-[#00ff88]/70 group-hover:text-[#00ff88] group-hover:gap-1.5'
                          }`}
                        >
                          {isPassed ? (
                            <>
                              <CheckCircle className="h-3.5 w-3.5" />
                              Completed
                            </>
                          ) : (
                            <>
                              Practice Now
                              <ChevronRight className="h-3.5 w-3.5" />
                            </>
                          )}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              /* Empty state */
              <div className="text-center py-12 space-y-4">
                <div
                  className="h-16 w-16 rounded-2xl bg-[#090e1a] border border-[#1e3a5f]/60 flex items-center justify-center mx-auto"
                  style={{ animation: 'float 4s ease-in-out infinite' }}
                >
                  <CheckCircle className="h-7 w-7 text-[#00ff88]/40" />
                </div>
                <div className="font-mono text-sm text-slate-500 flex items-center justify-center gap-1">
                  <span className="text-[#00ff88]/50">$</span>
                  <span>&gt; No active tasks scheduled. Stand by</span>
                  <span className="cursor-blink inline-block w-1.5 h-4 bg-[#00ff88]/50 ml-0.5" />
                </div>
                <p className="text-xs max-w-sm mx-auto text-slate-600 leading-relaxed">
                  No mandatory exercises active at the moment. Your faculty will schedule tasks soon.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
