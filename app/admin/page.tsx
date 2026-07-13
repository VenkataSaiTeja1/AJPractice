'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getCurrentSession } from '@/lib/supabase';
import { 
  Users, ClipboardList, TrendingUp, AlertTriangle, Download, 
  Search, Filter, Edit, CheckCircle, Clock, XCircle, RefreshCw, 
  Send, Plus, Trash, BookOpen, Key, Check, PlusCircle, LayoutGrid
} from 'lucide-react';

export default function TeacherAdminDashboard() {
  const router = useRouter();

  // Navigation state
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'tasks'>('overview');

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

  // Student CRUD Modal states
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [studentName, setStudentName] = useState('');
  const [studentRoll, setStudentRoll] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('student123'); // Default temp pass
  const [savingStudent, setSavingStudent] = useState(false);

  // Task CRUD Modal states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskUnit, setTaskUnit] = useState(1);
  const [taskType, setTaskType] = useState<'quiz' | 'coding' | 'cloud_lab'>('quiz');
  const [taskStarter, setTaskStarter] = useState('');
  const [taskExpected, setTaskExpected] = useState('');
  const [taskCloudUrl, setTaskCloudUrl] = useState('');
  
  // Quiz dynamic building states
  const [quizQuestions, setQuizQuestions] = useState<any[]>([
    { id: 'q1', question: '', options: ['', '', '', ''], correctOption: 0 }
  ]);
  const [savingTask, setSavingTask] = useState(false);

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

      // 1. Fetch profiles
      const { data: dbProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

      if (profilesError) throw profilesError;
      const studentProfiles = dbProfiles.filter(p => p.role === 'student');
      setStudents(studentProfiles);

      // 2. Fetch tasks
      const { data: dbTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('unit_number', { ascending: true });
      if (tasksError) throw tasksError;
      setTasks(dbTasks || []);

      // 3. Fetch submissions
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

      // Calculate Unit Bottlenecks
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
    // Check local table session
    const session = getCurrentSession();
    if (!session) {
      router.push('/login');
      return;
    }

    if (session.role !== 'faculty') {
      alert('Access denied. Students cannot enter the admin console.');
      router.push('/dashboard');
      return;
    }

    setProfile(session);
    fetchAdminData();
  }, [router]);

  // STUDENT CRUD HANDLERS
  const handleOpenStudentModal = (student: any = null) => {
    if (student) {
      setEditingStudent(student);
      setStudentName(student.full_name);
      setStudentRoll(student.roll_number || '');
      setStudentEmail(student.email);
      setStudentPassword(student.password);
    } else {
      setEditingStudent(null);
      setStudentName('');
      setStudentRoll('');
      setStudentEmail('');
      setStudentPassword('student123');
    }
    setShowStudentModal(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStudent(true);

    try {
      if (editingStudent) {
        // Edit student in Profiles
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: studentName,
            roll_number: studentRoll,
            email: studentEmail,
            password: studentPassword
          })
          .eq('id', editingStudent.id);

        if (error) throw error;
      } else {
        // Add new student (defaults to student role, first_login is true so they must reset password)
        const { error } = await supabase
          .from('profiles')
          .insert({
            email: studentEmail.trim(),
            password: studentPassword,
            full_name: studentName,
            roll_number: studentRoll,
            role: 'student',
            first_login: true
          });

        if (error) throw error;
      }

      setShowStudentModal(false);
      fetchAdminData();
    } catch (err: any) {
      alert(`Error saving student details: ${err.message}`);
    } finally {
      setSavingStudent(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (window.confirm('Are you sure you want to remove this student account? All submissions associated will be deleted permanently.')) {
      try {
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', studentId);

        if (error) throw error;
        fetchAdminData();
      } catch (err: any) {
        alert(`Failed to delete student: ${err.message}`);
      }
    }
  };

  // TASKS CRUD HANDLERS
  const handleOpenTaskModal = (task: any = null) => {
    if (task) {
      setEditingTask(task);
      setTaskTitle(task.title);
      setTaskDesc(task.description);
      setTaskUnit(task.unit_number);
      setTaskType(task.type);
      setTaskStarter(task.starter_code || '');
      setTaskExpected(task.expected_output || '');
      setTaskCloudUrl(task.cloud_ide_url || '');
      
      const metadata = task.metadata || {};
      setQuizQuestions(metadata.questions || [
        { id: 'q1', question: '', options: ['', '', '', ''], correctOption: 0 }
      ]);
    } else {
      setEditingTask(null);
      setTaskTitle('');
      setTaskDesc('');
      setTaskUnit(1);
      setTaskType('quiz');
      setTaskStarter('');
      setTaskExpected('');
      setTaskCloudUrl('');
      setQuizQuestions([
        { id: 'q1', question: '', options: ['', '', '', ''], correctOption: 0 }
      ]);
    }
    setShowTaskModal(true);
  };

  // Dynamic Quiz construction helpers
  const handleQuizQuestionChange = (index: number, field: string, val: any) => {
    setQuizQuestions(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleQuizOptionChange = (qIndex: number, optIndex: number, val: string) => {
    setQuizQuestions(prev => {
      const copy = [...prev];
      const options = [...copy[qIndex].options];
      options[optIndex] = val;
      copy[qIndex] = { ...copy[qIndex], options };
      return copy;
    });
  };

  const addQuizQuestion = () => {
    setQuizQuestions(prev => [
      ...prev,
      { id: `q${prev.length + 1}`, question: '', options: ['', '', '', ''], correctOption: 0 }
    ]);
  };

  const removeQuizQuestion = (index: number) => {
    setQuizQuestions(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTask(true);

    try {
      const payload: any = {
        title: taskTitle,
        description: taskDesc,
        unit_number: taskUnit,
        type: taskType
      };

      if (taskType === 'quiz') {
        payload.metadata = { questions: quizQuestions };
        payload.starter_code = null;
        payload.expected_output = null;
        payload.cloud_ide_url = null;
      } else if (taskType === 'coding') {
        payload.starter_code = taskStarter;
        payload.expected_output = taskExpected;
        payload.cloud_ide_url = null;
        payload.metadata = {};
      } else if (taskType === 'cloud_lab') {
        payload.starter_code = '// Paste repository or deploy URL link here';
        payload.cloud_ide_url = taskCloudUrl;
        payload.expected_output = null;
        payload.metadata = {};
      }

      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update(payload)
          .eq('id', editingTask.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert(payload);

        if (error) throw error;
      }

      setShowTaskModal(false);
      fetchAdminData();
    } catch (err: any) {
      alert(`Error updating task details: ${err.message}`);
    } finally {
      setSavingTask(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to remove this practice exercise? This action cannot be undone.')) {
      try {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', taskId);

        if (error) throw error;
        fetchAdminData();
      } catch (err: any) {
        alert(`Failed to delete exercise: ${err.message}`);
      }
    }
  };

  // SUBMISSION REVIEW
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

      alert('Review updated successfully!');
      setSelectedSub(null);
      fetchAdminData();
    } catch (err: any) {
      alert(`Failed to save review: ${err.message}`);
    } finally {
      setSavingReview(false);
    }
  };

  // EXPORT CSV
  const handleExportCSV = () => {
    if (students.length === 0) return;

    let csvContent = 'data:text/csv;charset=utf-8,Roll Number,Name,Unit I Score,Unit II Score,Unit III Score,Unit IV Score,Unit V Score,Average Score\n';

    students.forEach(student => {
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
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Faculty Control Panel</h1>
          <p className="text-xs text-slate-400 mt-1 font-light">Monitor student scores, curate curriculum exercises, and register student credentials.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-850 px-5 py-2.5 text-sm font-semibold transition-all shadow-md cursor-pointer"
          >
            <Download className="h-4.5 w-4.5" />
            Export Gradebook
          </button>
        </div>
      </div>

      {/* Tabs Selector Bar */}
      <div className="flex border-b border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'overview' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-1.5"><LayoutGrid className="h-4 w-4" /> Overview & Feed</div>
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'students' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-1.5"><Users className="h-4 w-4" /> Student Roster</div>
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'tasks' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> Curriculum Manager</div>
        </button>
      </div>

      {/* TAB CONTENTS */}
      {activeTab === 'overview' && (
        <>
          {/* Stats summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card p-5 border-slate-800 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Roster size</span>
                <p className="text-2xl font-extrabold text-white mt-0.5">{stats.activeStudents}</p>
              </div>
            </div>

            <div className="glass-card p-5 border-slate-800 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-purple-600/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Submissions Logged</span>
                <p className="text-2xl font-extrabold text-white mt-0.5">{stats.totalSubmissions}</p>
              </div>
            </div>

            <div className="glass-card p-5 border-slate-800 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Avg Completion</span>
                <p className="text-2xl font-extrabold text-white mt-0.5">{stats.completionRate}%</p>
              </div>
            </div>

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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Unit Bottlenecks */}
            <div className="lg:col-span-1 glass-card p-5 border border-slate-800 space-y-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
                  Syllabus Bottlenecks
                </h3>
                <p className="text-[11px] text-slate-500 leading-normal font-light mt-1">Tracks student failure rates to highlight units presenting structural blocks.</p>
              </div>

              <div className="space-y-4">
                {unitBottlenecks.map(ub => (
                  <div key={ub.unit} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">Unit {ub.unit}</span>
                      <span className="text-rose-400">{ub.failRate}% Fail Rate</span>
                    </div>
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

            {/* Submission logs feed */}
            <div className="lg:col-span-2 glass-card p-5 border border-slate-800 flex flex-col justify-between">
              <div className="space-y-4 flex-1">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Live Submission Log</h3>
                
                {/* Search & Filter bar */}
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
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full glass-input text-xs py-2 bg-slate-950 text-slate-300 cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="passed">Passed</option>
                      <option value="failed">Failed</option>
                      <option value="pending">Pending Review</option>
                    </select>
                  </div>

                  <div className="relative">
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="w-full glass-input text-xs py-2 bg-slate-950 text-slate-300 cursor-pointer"
                    >
                      <option value="all">All Task Types</option>
                      <option value="quiz">Quizzes</option>
                      <option value="coding">Code Sandboxes</option>
                      <option value="cloud_lab">Cloud Labs</option>
                    </select>
                  </div>
                </div>

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
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-[10.5px] font-semibold text-slate-300 cursor-pointer transition-all"
                                >
                                  Review
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-500 italic">No submissions logs logged.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'students' && (
        <div className="glass-card p-6 border border-slate-800 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-white">Student Directory Roster</h3>
              <p className="text-xs text-slate-400 font-light mt-0.5">Add student credentials manually here to grant them access instantly.</p>
            </div>
            <button
              onClick={() => handleOpenStudentModal()}
              className="inline-flex items-center gap-1 px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow transition-all"
            >
              <Plus className="h-4 w-4" /> Add Student
            </button>
          </div>

          <div className="border border-slate-900 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-slate-800 text-left text-xs text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 font-bold">
                <tr>
                  <th className="px-4 py-3">Roll Number</th>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Active Password</th>
                  <th className="px-4 py-3">First Login Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-950/20">
                {students.length > 0 ? (
                  students.map(s => (
                    <tr key={s.id} className="hover:bg-slate-900/10">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-200">{s.roll_number}</td>
                      <td className="px-4 py-3 font-semibold text-white">{s.full_name}</td>
                      <td className="px-4 py-3">{s.email}</td>
                      <td className="px-4 py-3 font-mono text-indigo-400">{s.password}</td>
                      <td className="px-4 py-3">
                        {s.first_login ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400 border border-amber-500/20">Must Change</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400 border border-emerald-500/20">Updated</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => handleOpenStudentModal(s)}
                          className="px-2.5 py-1 text-[10.5px] rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(s.id)}
                          className="px-2.5 py-1 text-[10.5px] rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic">No student accounts registered. Click Add Student above to begin.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="glass-card p-6 border border-slate-800 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-white">Syllabus Practice Tasks</h3>
              <p className="text-xs text-slate-400 font-light mt-0.5">Manage tasks in the syllabus. Changes propagate immediately to all student modules.</p>
            </div>
            <button
              onClick={() => handleOpenTaskModal()}
              className="inline-flex items-center gap-1 px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow transition-all"
            >
              <Plus className="h-4 w-4" /> Add Task
            </button>
          </div>

          <div className="border border-slate-900 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-slate-800 text-left text-xs text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 font-bold">
                <tr>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Classification Type</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-950/20">
                {tasks.length > 0 ? (
                  tasks.map(t => (
                    <tr key={t.id} className="hover:bg-slate-900/10">
                      <td className="px-4 py-3 font-semibold text-slate-200">Unit {t.unit_number}</td>
                      <td className="px-4 py-3 font-semibold text-white">{t.title}</td>
                      <td className="px-4 py-3 capitalize">{t.type.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => handleOpenTaskModal(t)}
                          className="px-2.5 py-1 text-[10.5px] rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="px-2.5 py-1 text-[10.5px] rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500 italic">No exercises created yet. Click Add Task above.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STUDENT CRUD OVERLAY MODAL */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveStudent} className="w-full max-w-md glass-card border border-indigo-500/20 bg-slate-950 p-6 shadow-2xl space-y-4 flex flex-col justify-between">
            <div className="border-b border-slate-850 pb-2.5">
              <h3 className="text-sm font-bold text-white">{editingStudent ? 'Edit Student Details' : 'Register Student Account'}</h3>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rachel Green"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full glass-input text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Roll Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS2026101"
                  value={studentRoll}
                  onChange={(e) => setStudentRoll(e.target.value)}
                  className="w-full glass-input text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rachel@university.edu"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  className="w-full glass-input text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account Password</label>
                <input
                  type="text"
                  required
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  className="w-full glass-input text-xs font-mono text-indigo-400"
                />
                {!editingStudent && (
                  <span className="text-[9px] text-slate-500 leading-none">Default temp password. Enforces password change on login.</span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3.5 border-t border-slate-850 pt-4 mt-3">
              <button
                type="button"
                onClick={() => setShowStudentModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingStudent}
                className="inline-flex items-center gap-1 px-5 py-2 text-xs font-bold rounded bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-all shadow"
              >
                <Check className="h-3.5 w-3.5" />
                {savingStudent ? 'Saving...' : 'Register Student'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TASK CRUD OVERLAY MODAL */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleSaveTask} className="w-full max-w-2xl glass-card border border-indigo-500/20 bg-slate-950 p-6 shadow-2xl space-y-4 flex flex-col justify-between my-8 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-850 pb-2.5">
              <h3 className="text-sm font-bold text-white">{editingTask ? 'Edit Practice Exercise' : 'Create Practice Exercise'}</h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Exercise Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Servlet Request Mapping"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full glass-input text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Unit (1 to 5)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="5"
                      value={taskUnit}
                      onChange={(e) => setTaskUnit(Number(e.target.value))}
                      className="w-full glass-input text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Task Type</label>
                    <select
                      value={taskType}
                      onChange={(e) => setTaskType(e.target.value as any)}
                      className="w-full glass-input text-xs bg-slate-950 text-slate-300 cursor-pointer"
                    >
                      <option value="quiz">Interactive Quiz</option>
                      <option value="coding">Coding Sandbox</option>
                      <option value="cloud_lab">Cloud IDE Lab</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Problem Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Summarize the learning objective and requirements..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full glass-input text-xs resize-none"
                />
              </div>

              {/* RENDER FORMS BASED ON TASK TYPE */}
              {taskType === 'quiz' && (
                <div className="border border-slate-900 rounded-lg p-4 space-y-4 bg-slate-950/20 max-h-[300px] overflow-y-auto">
                  <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Quiz Questions Manager</span>
                    <button
                      type="button"
                      onClick={addQuizQuestion}
                      className="inline-flex items-center gap-1 text-[10.5px] text-indigo-400 font-semibold cursor-pointer hover:text-indigo-300"
                    >
                      <PlusCircle className="h-3.5 w-3.5" /> Add Question
                    </button>
                  </div>

                  {quizQuestions.map((q, qIdx) => (
                    <div key={q.id || qIdx} className="space-y-3 bg-slate-950/40 p-3 rounded border border-slate-900/60 relative">
                      <button
                        type="button"
                        onClick={() => removeQuizQuestion(qIdx)}
                        className="absolute top-3 right-3 text-slate-600 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash className="h-4 w-4" />
                      </button>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-semibold uppercase text-slate-500">Question {qIdx + 1}</label>
                        <input
                          type="text"
                          required
                          placeholder="Type question content..."
                          value={q.question}
                          onChange={(e) => handleQuizQuestionChange(qIdx, 'question', e.target.value)}
                          className="w-full glass-input text-[11px] py-1.5"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {q.options.map((opt: string, optIdx: number) => (
                          <div key={optIdx} className="space-y-1">
                            <span className="text-[8.5px] font-medium text-slate-600">Option {optIdx + 1}</span>
                            <input
                              type="text"
                              required
                              placeholder={`Option ${optIdx + 1}`}
                              value={opt}
                              onChange={(e) => handleQuizOptionChange(qIdx, optIdx, e.target.value)}
                              className="w-full glass-input text-[11px] py-1"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="w-1/2 space-y-1">
                        <label className="text-[8.5px] font-medium text-slate-600">Correct Answer Option</label>
                        <select
                          value={q.correctOption}
                          onChange={(e) => handleQuizQuestionChange(qIdx, 'correctOption', Number(e.target.value))}
                          className="w-full glass-input text-[11px] py-1 bg-slate-950 text-slate-300"
                        >
                          <option value={0}>Option 1</option>
                          <option value={1}>Option 2</option>
                          <option value={2}>Option 3</option>
                          <option value={3}>Option 4</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {taskType === 'coding' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Starter Java Code</label>
                    <textarea
                      rows={6}
                      placeholder="public class Main { ..."
                      value={taskStarter}
                      onChange={(e) => setTaskStarter(e.target.value)}
                      className="w-full glass-input font-mono text-[11px] resize-none leading-normal"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expected Console Output</label>
                    <textarea
                      rows={6}
                      placeholder="Plain text output to evaluate against..."
                      value={taskExpected}
                      onChange={(e) => setTaskExpected(e.target.value)}
                      className="w-full glass-input font-mono text-[11px] resize-none leading-normal"
                    />
                  </div>
                </div>
              )}

              {taskType === 'cloud_lab' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cloud IDE Configuration Template URL</label>
                  <input
                    type="text"
                    required
                    placeholder="https://github.com/codespaces/new?repo=username/project-template"
                    value={taskCloudUrl}
                    onChange={(e) => setTaskCloudUrl(e.target.value)}
                    className="w-full glass-input text-xs"
                  />
                  <span className="text-[9px] text-slate-500 leading-normal block">Provide a pre-configured template URL to spawn codespaces containing Tomcat configuration settings.</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3.5 border-t border-slate-850 pt-4 mt-3">
              <button
                type="button"
                onClick={() => setShowTaskModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingTask}
                className="inline-flex items-center gap-1 px-5 py-2 text-xs font-bold rounded bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-all shadow"
              >
                <Check className="h-3.5 w-3.5" />
                {savingTask ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MANUAL GRADING REVIEW OVERLAY MODAL */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl glass-card border border-indigo-500/20 bg-slate-950 p-6 shadow-2xl relative flex flex-col justify-between max-h-[85vh] overflow-y-auto">
            <div className="space-y-4">
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

              <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800/80 text-xs">
                <span className="font-semibold text-indigo-400 uppercase tracking-wide text-[10px]">
                  {(selectedSub.tasks || {}).type} Unit {(selectedSub.tasks || {}).unit_number}
                </span>
                <h4 className="text-white font-bold mt-0.5">{(selectedSub.tasks || {}).title}</h4>
              </div>

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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</label>
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value as any)}
                    className="w-full glass-input text-xs bg-slate-950 text-slate-300 cursor-pointer"
                  >
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

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
