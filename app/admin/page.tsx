'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Users, ClipboardList, TrendingUp, AlertTriangle, Download, 
  Search, Filter, Edit, CheckCircle, Clock, XCircle, RefreshCw, Send, Check 
} from 'lucide-react';

export default function TeacherAdminDashboard() {
  const router = useRouter();

  // Loading states
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  // Database lists
  const [students, setStudents] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Manual review modal states
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [reviewScore, setReviewScore] = useState(0);
  const [reviewStatus, setReviewStatus] = useState<'passed' | 'failed' | 'pending'>('pending');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  // Statistics
  const [stats, setStats] = useState({
    activeStudents: 0,
    totalSubmissions: 0,
    completionRate: 0,
    pendingReviews: 0
  });

  const [unitBottlenecks, setUnitBottlenecks] = useState<any[]>([]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);

      // 1. Fetch profiles of students
      const { data: dbProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;
      const studentProfiles = dbProfiles.filter(p => p.role === 'student');
      setStudents(studentProfiles);

      // 2. Fetch tasks
      const { data: dbTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*');
      if (tasksError) throw tasksError;
      setTasks(dbTasks || []);

      // 3. Fetch submissions joined with profile and task details
      const { data: dbSubmissions, error: subsError } = await supabase
        .from('submissions')
        .select(`
          *,
          profiles:student_id(full_name, roll_number, role),
          tasks:task_id(title, unit_number, type)
        `)
        .order('submitted_at', { ascending: false });

      if (subsError) throw subsError;
      setSubmissions(dbSubmissions || []);

      // Calculate Stats
      const activeStudents = studentProfiles.length;
      const totalSubmissions = dbSubmissions ? dbSubmissions.length : 0;
      const pendingReviews = dbSubmissions ? dbSubmissions.filter(s => s.status === 'pending').length : 0;

      // Average Unit completion rate: percentage of tasks passed across all students
      let completionRate = 0;
      if (activeStudents > 0 && dbTasks && dbTasks.length > 0) {
        const totalPossibleCompletions = activeStudents * dbTasks.length;
        const passedCount = dbSubmissions ? dbSubmissions.filter(s => s.status === 'passed').length : 0;
        completionRate = Math.round((passedCount / totalPossibleCompletions) * 100);
      }

      setStats({
        activeStudents,
        totalSubmissions,
        completionRate: isNaN(completionRate) ? 0 : completionRate,
        pendingReviews
      });

      // Calculate Unit Bottlenecks (highest failure rates per unit)
      const unitStats = [1, 2, 3, 4, 5].map(unitNum => {
        const unitTasks = (dbTasks || []).filter(t => t.unit_number === unitNum);
        const unitTaskIds = unitTasks.map(t => t.id);
        const unitSubs = (dbSubmissions || []).filter(s => unitTaskIds.includes(s.task_id));
        
        const total = unitSubs.length;
        const failed = unitSubs.filter(s => s.status === 'failed').length;
        const failRate = total > 0 ? Math.round((failed / total) * 100) : 0;

        return {
          unit: unitNum,
          name: `Unit ${unitNum}`,
          failRate,
          totalSubmissions: total,
          failedCount: failed
        };
      });
      setUnitBottlenecks(unitStats);

    } catch (err: any) {
      console.error('Error fetching admin data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function checkTeacherAuth() {
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

      if (error || !prof || prof.role !== 'teacher') {
        alert('Unauthorized access. Only teachers can access the admin dashboard.');
        router.push('/dashboard');
        return;
      }

      setProfile(prof);
      fetchAdminData();
    }

    checkTeacherAuth();
  }, [router]);

  const handleOpenReview = (sub: any) => {
    setSelectedSub(sub);
    setReviewScore(sub.score);
    setReviewStatus(sub.status);
    setReviewFeedback(sub.feedback || '');
  };

  const handleSaveReview = async () => {
    if (!selectedSub) return;
    setSavingReview(true);

    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          score: reviewScore,
          status: reviewStatus,
          feedback: reviewFeedback
        })
        .eq('id', selectedSub.id);

      if (error) throw error;

      alert('Review submitted successfully!');
      setSelectedSub(null);
      fetchAdminData();
    } catch (err: any) {
      alert(`Failed to save review: ${err.message}`);
    } finally {
      setSavingReview(false);
    }
  };

  // CSV Exporter
  const handleExportCSV = () => {
    if (students.length === 0) return;

    // Header row
    let csvContent = 'data:text/csv;charset=utf-8,Roll Number,Name,Unit I Score,Unit II Score,Unit III Score,Unit IV Score,Unit V Score,Average Score\n';

    students.forEach(student => {
      // Find highest score per unit
      const studentSubs = submissions.filter(s => s.student_id === student.id);
      
      const unitScores = [1, 2, 3, 4, 5].map(unitNum => {
        const unitSubs = studentSubs.filter(s => s.tasks && s.tasks.unit_number === unitNum);
        if (unitSubs.length === 0) return 0;
        return Math.max(...unitSubs.map(s => s.score));
      });

      const avgScore = Math.round(unitScores.reduce((a, b) => a + b, 0) / 5);

      csvContent += `"${student.roll_number || 'N/A'}","${student.full_name}",${unitScores.join(',')},${avgScore}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'advanced_java_grades.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">Passed</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-400 border border-rose-500/20">Failed</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/20">Pending</span>;
    }
  };

  // Filter Submissions
  const filteredSubmissions = submissions.filter(sub => {
    const student = sub.profiles || {};
    const taskDetails = sub.tasks || {};
    
    const matchesSearch = 
      (student.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.roll_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (taskDetails.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const matchesType = typeFilter === 'all' || taskDetails.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[75vh]">
        <div className="text-center space-y-3">
          <RefreshCw className="h-10 w-10 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Loading teacher dashboard logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Teacher Control Panel</h1>
          <p className="text-xs text-slate-400 mt-1 font-light">Monitor syllabus completion rates, inspect submissions, and review code sandboxes.</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 text-sm font-semibold transition-all shadow-md cursor-pointer"
        >
          <Download className="h-4.5 w-4.5" />
          Export Gradebook (CSV)
        </button>
      </div>

      {/* Grid of Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1 */}
        <div className="glass-card p-5 border-slate-800 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Students</span>
            <p className="text-2xl font-extrabold text-white mt-0.5">{stats.activeStudents}</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="glass-card p-5 border-slate-800 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-purple-600/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Submissions Logged</span>
            <p className="text-2xl font-extrabold text-white mt-0.5">{stats.totalSubmissions}</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="glass-card p-5 border-slate-800 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Avg Completion</span>
            <p className="text-2xl font-extrabold text-white mt-0.5">{stats.completionRate}%</p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="glass-card p-5 border-slate-800 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-600/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pending Reviews</span>
            <p className="text-2xl font-extrabold text-white mt-0.5">{stats.pendingReviews}</p>
          </div>
        </div>

      </div>

      {/* Bottlenecks Chart & Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Unit Bottleneck Tracker */}
        <div className="lg:col-span-1 glass-card p-5 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
              Syllabus Bottlenecks
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal font-light mt-1">Tracks the failure rates of students on a per unit basis to highlight difficult concepts.</p>
          </div>

          <div className="space-y-4">
            {unitBottlenecks.map(ub => (
              <div key={ub.unit} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">Unit {ub.unit}</span>
                  <span className="text-rose-400">{ub.failRate}% Fail Rate</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-900 border border-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-rose-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${ub.failRate}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>{ub.failedCount} Failed runs</span>
                  <span>{ub.totalSubmissions} Total attempts</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Live Submission Feed Filters & List */}
        <div className="lg:col-span-2 glass-card p-5 border border-slate-800 flex flex-col justify-between">
          <div className="space-y-4 flex-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Live Submission Log</h3>
            
            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search students, roll numbers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full glass-input pl-9 text-xs py-2"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full glass-input pl-9 text-xs py-2 appearance-none bg-slate-950/80 text-slate-300 cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="passed">Passed</option>
                  <option value="failed">Failed</option>
                  <option value="pending">Pending Review</option>
                </select>
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full glass-input pl-9 text-xs py-2 appearance-none bg-slate-950/80 text-slate-300 cursor-pointer"
                >
                  <option value="all">All Task Types</option>
                  <option value="quiz">Quizzes</option>
                  <option value="coding">Code Sandboxes</option>
                  <option value="cloud_lab">Cloud Labs</option>
                </select>
              </div>
            </div>

            {/* Table or Cards */}
            <div className="overflow-x-auto border border-slate-900 rounded-lg max-h-[350px] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-800 text-left text-xs text-slate-300">
                <thead className="bg-slate-900/60 text-slate-400 font-bold">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Task Details</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 bg-slate-950/20">
                  {filteredSubmissions.length > 0 ? (
                    filteredSubmissions.map((sub) => {
                      const student = sub.profiles || {};
                      const taskDetails = sub.tasks || {};
                      return (
                        <tr key={sub.id} className="hover:bg-slate-900/20 transition-all">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-white">{student.full_name}</div>
                            <div className="text-[10px] text-slate-500">Roll: {student.roll_number || 'N/A'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-200">{taskDetails.title}</div>
                            <div className="text-[10px] text-slate-500">Unit: {taskDetails.unit_number} | {taskDetails.type}</div>
                          </td>
                          <td className="px-4 py-3">{getStatusBadge(sub.status)}</td>
                          <td className="px-4 py-3 font-semibold">{sub.score}%</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleOpenReview(sub)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-[10px] font-semibold text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer transition-all"
                            >
                              <Edit className="h-3 w-3" />
                              Review
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500 italic">No submissions match the search filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>

      </div>

      {/* Manual Grading Review Overlay Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl glass-card border border-indigo-500/20 bg-slate-950 p-6 shadow-2xl relative flex flex-col justify-between max-h-[85vh] overflow-y-auto">
            
            <div className="space-y-4">
              {/* Modal Header */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-bold text-white">Review Student Submission</h2>
                  <p className="text-[11px] text-slate-400 font-light mt-0.5">
                    Grading: <span className="font-semibold text-white">{(selectedSub.profiles || {}).full_name}</span> (Roll: {(selectedSub.profiles || {}).roll_number || 'N/A'})
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSub(null)}
                  className="text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  Close [X]
                </button>
              </div>

              {/* Task Details Info */}
              <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800/80 text-xs">
                <span className="font-semibold text-indigo-400 uppercase tracking-wide text-[10px]">
                  {(selectedSub.tasks || {}).type} Unit {(selectedSub.tasks || {}).unit_number}
                </span>
                <h4 className="text-white font-bold mt-0.5">{(selectedSub.tasks || {}).title}</h4>
              </div>

              {/* Submission Content */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Submitted Workspace Content</label>
                {(selectedSub.tasks || {}).type === 'cloud_lab' ? (
                  <div className="p-4 bg-slate-950/80 rounded-lg border border-slate-900 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-300 break-all select-all">{selectedSub.submitted_content}</span>
                    <a
                      href={selectedSub.submitted_content}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded px-3 py-1 font-semibold text-[10.5px]"
                    >
                      Open Link
                    </a>
                  </div>
                ) : (
                  <pre className="p-4 bg-slate-950/80 border border-slate-900 rounded-lg font-mono text-[11px] text-emerald-400 overflow-auto max-h-[220px] select-all leading-normal whitespace-pre">
                    {selectedSub.submitted_content}
                  </pre>
                )}
              </div>

              {/* Grading Input Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Score */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Score (0 - 100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={reviewScore}
                    onChange={(e) => setReviewScore(Number(e.target.value))}
                    className="w-full glass-input text-xs"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</label>
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value as any)}
                    className="w-full glass-input text-xs appearance-none bg-slate-950/80 text-slate-300 cursor-pointer"
                  >
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

              </div>

              {/* Review Feedback Comments */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Teacher Comments & Feedback</label>
                <textarea
                  placeholder="Provide instructions or feedback on code revisions..."
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  rows={3}
                  className="w-full glass-input text-xs resize-none"
                />
              </div>

            </div>

            {/* Modal Actions */}
            <div className="border-t border-slate-800 pt-4 mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedSub(null)}
                className="rounded border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReview}
                disabled={savingReview}
                className="inline-flex items-center gap-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white px-5 py-2 text-xs font-bold cursor-pointer transition-all"
              >
                <Send className="h-3.5 w-3.5" />
                {savingReview ? 'Saving review...' : 'Submit Evaluation'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
