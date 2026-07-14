'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getCurrentSession } from '@/lib/supabase';
import { 
  Users, ClipboardList, TrendingUp, AlertTriangle, Download, 
  Search, Filter, Edit, CheckCircle, Clock, XCircle, RefreshCw, 
  Send, Plus, Trash, BookOpen, Key, Check, PlusCircle, LayoutGrid, BarChart2
} from 'lucide-react';

export default function TeacherAdminDashboard() {
  const router = useRouter();

  // Navigation state
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'tasks' | 'monitor'>('overview');

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
  
  // Year filtration
  const [rosterYearFilter, setRosterYearFilter] = useState<'all' | '2' | '3'>('all');
  const [monitorYearFilter, setMonitorYearFilter] = useState<'2' | '3'>('3');

  // Progress Monitoring tab states
  const [selectedMonitorTaskId, setSelectedMonitorTaskId] = useState<string>('');
  const [monitorCompleted, setMonitorCompleted] = useState<any[]>([]);
  const [monitorPending, setMonitorPending] = useState<any[]>([]);
  const [monitorUncompleted, setMonitorUncompleted] = useState<any[]>([]);
  const [monitorStats, setMonitorStats] = useState({ total: 0, completed: 0, uncompleted: 0, rate: 0 });

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
  const [studentPassword, setStudentPassword] = useState('student123'); // Default temp pass
  const [studentYear, setStudentYear] = useState<number>(3); // 2nd or 3rd year
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
  const [taskYear, setTaskYear] = useState<number>(3); // Target year: 2 or 3
  
  // Timings
  const [taskStartTime, setTaskStartTime] = useState('');
  const [taskEndTime, setTaskEndTime] = useState('');
  
  // Quiz dynamic building states
  const [quizQuestions, setQuizQuestions] = useState<any[]>([
    { id: 'q1', question: '', options: ['', '', '', ''], correctOption: 0 }
  ]);
  
  // Multiple test cases manager
  const [codingTestCases, setCodingTestCases] = useState<any[]>([
    { input: '', expected: '' }
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

  // Helper to format ISO to datetime-local value (YYYY-MM-DDTHH:MM)
  const formatIsoToDatetimeLocal = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const tzoffset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

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
          profiles:student_id(full_name, roll_number, role, year),
          tasks:task_id(title, unit_number, type, year)
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
        // Group possible completions by students mapping to task years
        let totalPossibleCompletions = 0;
        studentProfiles.forEach(student => {
          const matchingTasksCount = (dbTasks || []).filter(t => t.year === student.year).length;
          totalPossibleCompletions += matchingTasksCount;
        });

        const passedCount = dbSubmissions ? dbSubmissions.filter(s => s.status === 'passed').length : 0;
        completionRate = totalPossibleCompletions > 0 
          ? Math.round((passedCount / totalPossibleCompletions) * 100) 
          : 0;
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

  // Set default monitor task whenever the filter year shifts or tasks change
  useEffect(() => {
    const yearTasks = tasks.filter(t => t.year === Number(monitorYearFilter));
    if (yearTasks.length > 0) {
      // Find if current selected task is in the filtered list
      const matches = yearTasks.some(t => t.id === selectedMonitorTaskId);
      if (!matches) {
        setSelectedMonitorTaskId(yearTasks[0].id);
      }
    } else {
      setSelectedMonitorTaskId('');
    }
  }, [monitorYearFilter, tasks, selectedMonitorTaskId]);

  // Compute live progress split for the selected task in the monitor tab
  useEffect(() => {
    if (!selectedMonitorTaskId || students.length === 0) {
      setMonitorCompleted([]);
      setMonitorPending([]);
      setMonitorUncompleted([]);
      setMonitorStats({ total: 0, completed: 0, uncompleted: 0, rate: 0 });
      return;
    }

    const currentTask = tasks.find(t => t.id === selectedMonitorTaskId);
    if (!currentTask) return;

    // Filter students belonging to the target year of this task
    const targetStudents = students.filter(s => s.year === currentTask.year);

    // Filter submissions for this specific task
    const taskSubs = submissions.filter(s => s.task_id === selectedMonitorTaskId);

    // Group submissions by student (keep highest score or passed status)
    const bestStudentSubs: { [key: string]: any } = {};
    taskSubs.forEach(sub => {
      const studentId = sub.student_id;
      if (!bestStudentSubs[studentId] || sub.status === 'passed') {
        bestStudentSubs[studentId] = sub;
      }
    });

    const completed: any[] = [];
    const pending: any[] = [];
    const uncompleted: any[] = [];

    targetStudents.forEach(student => {
      const sub = bestStudentSubs[student.id];
      if (sub) {
        if (sub.status === 'passed') {
          completed.push({
            student,
            score: sub.score,
            submittedAt: sub.submitted_at
          });
        } else if (sub.status === 'pending') {
          pending.push({
            student,
            score: sub.score,
            submittedAt: sub.submitted_at
          });
        } else {
          uncompleted.push({
            student,
            status: 'failed',
            score: sub.score
          });
        }
      } else {
        uncompleted.push({
          student,
          status: 'unattempted',
          score: 0
        });
      }
    });

    const totalCount = targetStudents.length;
    const completedCount = completed.length;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    setMonitorCompleted(completed);
    setMonitorPending(pending);
    setMonitorUncompleted(uncompleted);
    setMonitorStats({
      total: totalCount,
      completed: completedCount,
      uncompleted: totalCount - completedCount,
      rate: completionRate
    });

  }, [selectedMonitorTaskId, students, submissions, tasks]);

  // STUDENT CRUD HANDLERS
  const handleOpenStudentModal = (student: any = null) => {
    if (student) {
      setEditingStudent(student);
      setStudentName(student.full_name);
      setStudentRoll(student.roll_number || '');
      setStudentPassword(student.password);
      setStudentYear(student.year || 3);
    } else {
      setEditingStudent(null);
      setStudentName('');
      setStudentRoll('');
      setStudentPassword('student123');
      setStudentYear(3);
    }
    setShowStudentModal(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStudent(true);

    try {
      const generatedEmail = `${studentRoll.trim().toLowerCase()}@portal.com`;

      if (editingStudent) {
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: studentName,
            roll_number: studentRoll.trim(),
            email: generatedEmail,
            password: studentPassword,
            year: studentYear
          })
          .eq('id', editingStudent.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('profiles')
          .insert({
            email: generatedEmail,
            password: studentPassword,
            full_name: studentName,
            roll_number: studentRoll.trim(),
            role: 'student',
            first_login: true,
            year: studentYear
          });

        if (error) throw error;
      }

      setShowStudentModal(false);
      fetchAdminData();
    } catch (err: any) {
      alert(`Error saving student: ${err.message}`);
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
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    if (task) {
      setEditingTask(task);
      setTaskTitle(task.title);
      setTaskDesc(task.description);
      setTaskUnit(task.unit_number);
      setTaskType(task.type);
      setTaskStarter(task.starter_code || '');
      setTaskExpected(task.expected_output || '');
      setTaskCloudUrl(task.cloud_ide_url || '');
      setTaskYear(task.year || 3);
      setTaskStartTime(formatIsoToDatetimeLocal(task.start_time || now.toISOString()));
      setTaskEndTime(formatIsoToDatetimeLocal(task.end_time || tomorrow.toISOString()));
      
      const metadata = task.metadata || {};
      setQuizQuestions(metadata.questions || [
        { id: 'q1', question: '', options: ['', '', '', ''], correctOption: 0 }
      ]);
      setCodingTestCases(metadata.testCases || [
        { input: '', expected: '' }
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
      setTaskYear(3);
      setTaskStartTime(formatIsoToDatetimeLocal(now.toISOString()));
      setTaskEndTime(formatIsoToDatetimeLocal(tomorrow.toISOString()));
      setQuizQuestions([
        { id: 'q1', question: '', options: ['', '', '', ''], correctOption: 0 }
      ]);
      setCodingTestCases([
        { input: '', expected: '' }
      ]);
    }
    setShowTaskModal(true);
  };

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

  // MULTIPLE TEST CASES HANDLERS
  const handleTestCaseChange = (index: number, field: 'input' | 'expected', value: string) => {
    setCodingTestCases(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addTestCase = () => {
    setCodingTestCases(prev => [...prev, { input: '', expected: '' }]);
  };

  const removeTestCase = (index: number) => {
    setCodingTestCases(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTask(true);

    try {
      const payload: any = {
        title: taskTitle,
        description: taskDesc,
        unit_number: taskUnit,
        type: taskType,
        year: taskYear,
        start_time: new Date(taskStartTime).toISOString(),
        end_time: new Date(taskEndTime).toISOString()
      };

      if (taskType === 'quiz') {
        payload.metadata = { questions: quizQuestions };
        payload.starter_code = null;
        payload.expected_output = null;
        payload.cloud_ide_url = null;
      } else if (taskType === 'coding') {
        payload.starter_code = taskStarter;
        // Keep expected_output updated with first test case's expected output for backwards compatibility
        payload.expected_output = codingTestCases[0]?.expected || '';
        payload.cloud_ide_url = null;
        payload.metadata = { testCases: codingTestCases };
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

  // EXPORT GRADEBOOK CSV
  const handleExportCSV = () => {
    if (students.length === 0) return;

    let csvContent = 'data:text/csv;charset=utf-8,Roll Number,Name,Year,Unit I Score,Unit II Score,Unit III Score,Unit IV Score,Unit V Score,Average Score\n';

    students.forEach(student => {
      const studentSubs = submissions.filter(s => s.student_id === student.id);
      
      const unitScores = [1, 2, 3, 4, 5].map(unitNum => {
        const unitSubs = studentSubs.filter(s => s.tasks && s.tasks.unit_number === unitNum);
        if (unitSubs.length === 0) return 0;
        return Math.max(...unitSubs.map(s => s.score));
      });

      const avgScore = Math.round(unitScores.reduce((a, b) => a + b, 0) / 5);

      csvContent += `"${student.roll_number || 'N/A'}","${student.full_name}",${student.year || 'N/A'},${unitScores.join(',')},${avgScore}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'practice_portal_grades.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EXPORT SPECIFIC TASK CSV
  const handleExportTaskCSV = () => {
    const selectedTask = tasks.find(t => t.id === selectedMonitorTaskId);
    if (!selectedTask) return;

    let csvContent = `data:text/csv;charset=utf-8,Task Title: ${selectedTask.title} (Year: ${selectedTask.year})\n`;
    csvContent += 'Roll Number,Student Name,Status,Score,Submission Date\n';

    monitorCompleted.forEach(c => {
      csvContent += `"${c.student.roll_number || 'N/A'}","${c.student.full_name}","Completed",${c.score},"${new Date(c.submittedAt).toLocaleDateString()}"\n`;
    });

    monitorPending.forEach(p => {
      csvContent += `"${p.student.roll_number || 'N/A'}","${p.student.full_name}","Pending Review",${p.score},"${new Date(p.submittedAt).toLocaleDateString()}"\n`;
    });

    monitorUncompleted.forEach(u => {
      csvContent += `"${u.student.roll_number || 'N/A'}","${u.student.full_name}","${u.status === 'failed' ? 'Failed' : 'Unattempted'}",${u.score},N/A\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `task_report_year${selectedTask.year}_${selectedTask.title.replace(/\s+/g, '_').toLowerCase()}.csv`);
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

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Practice portal By VVS</h1>
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
          onClick={() => setActiveTab('monitor')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'monitor' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-1.5"><BarChart2 className="h-4 w-4" /> Progress Monitor</div>
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
                                <div className="text-[10px] text-slate-500">Year {student.year} | Roll: {student.roll_number || 'N/A'}</div>
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

      {/* PROGRESS MONITORING TAB */}
      {activeTab === 'monitor' && (
        <div className="glass-card p-6 border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">Task Completion Progress Tracker</h3>
              <p className="text-xs text-slate-400 font-light mt-0.5">Select target year and task below to track active student submissions and downloads.</p>
            </div>
            
            {selectedMonitorTaskId && (
              <button
                onClick={handleExportTaskCSV}
                className="flex items-center gap-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-xs font-semibold cursor-pointer transition-all shadow"
              >
                <Download className="h-4 w-4" /> Download Task CSV Report
              </button>
            )}
          </div>

          {/* Year and Task Selection Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Filter Year of Study</label>
              <select
                value={monitorYearFilter}
                onChange={(e) => {
                  setMonitorYearFilter(e.target.value as any);
                }}
                className="w-full glass-input text-xs bg-slate-950 text-slate-300 cursor-pointer"
              >
                <option value="2">2nd Year (Java)</option>
                <option value="3">3rd Year (Advanced Java)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected Practice Exercise</label>
              <select
                value={selectedMonitorTaskId}
                onChange={(e) => setSelectedMonitorTaskId(e.target.value)}
                className="w-full glass-input text-xs bg-slate-950 text-slate-300 cursor-pointer"
              >
                {tasks.filter(t => t.year === Number(monitorYearFilter)).length > 0 ? (
                  tasks.filter(t => t.year === Number(monitorYearFilter)).map(t => (
                    <option key={t.id} value={t.id}>
                      Unit {t.unit_number} - {t.title} ({t.type})
                    </option>
                  ))
                ) : (
                  <option value="">No tasks available for Year {monitorYearFilter}</option>
                )}
              </select>
            </div>
          </div>

          {/* Task Metrics row */}
          {selectedMonitorTaskId && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-lg">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Target Year Students</span>
                <span className="text-xl font-extrabold text-white">{monitorStats.total}</span>
              </div>
              <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-lg">
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block">Completed (Passed)</span>
                <span className="text-xl font-extrabold text-emerald-400">{monitorStats.completed}</span>
              </div>
              <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-lg">
                <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider block">Not Completed</span>
                <span className="text-xl font-extrabold text-rose-400">{monitorStats.uncompleted}</span>
              </div>
              <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-lg">
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block font-semibold">Completion Rate</span>
                <span className="text-xl font-extrabold text-indigo-400">{monitorStats.rate}%</span>
              </div>
            </div>
          )}

          {/* Split lists: Completed vs Not Completed */}
          {selectedMonitorTaskId && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              
              {/* Roster A: Completed */}
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <div className="bg-slate-900/60 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" /> Completed Roster ({monitorCompleted.length})
                  </span>
                </div>
                <div className="divide-y divide-slate-900 max-h-[350px] overflow-y-auto bg-slate-950/20 text-xs">
                  {monitorCompleted.length > 0 ? (
                    monitorCompleted.map(c => (
                      <div key={c.student.id} className="p-4 flex items-center justify-between hover:bg-slate-900/10">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-white">{c.student.full_name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">Roll: {c.student.roll_number}</p>
                        </div>
                        <div className="text-right space-y-0.5">
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                            Score: {c.score}%
                          </span>
                          <p className="text-[9px] text-slate-500">Passed: {new Date(c.submittedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-500 italic">No students have completed this task yet.</div>
                  )}
                </div>
              </div>

              {/* Roster B: Not Completed */}
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <div className="bg-slate-900/60 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <XCircle className="h-4 w-4" /> Not Completed Roster ({monitorUncompleted.length + monitorPending.length})
                  </span>
                </div>
                <div className="divide-y divide-slate-900 max-h-[350px] overflow-y-auto bg-slate-950/20 text-xs">
                  {/* First display pending review users */}
                  {monitorPending.map(p => (
                    <div key={p.student.id} className="p-4 flex items-center justify-between hover:bg-slate-900/10 bg-amber-500/5">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-white">{p.student.full_name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">Roll: {p.student.roll_number}</p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                          Awaiting Review
                        </span>
                        <p className="text-[9px] text-slate-500">Submitted: {new Date(p.submittedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Then display failed or unattempted users */}
                  {monitorUncompleted.length > 0 || monitorPending.length > 0 ? (
                    monitorUncompleted.map(u => (
                      <div key={u.student.id} className="p-4 flex items-center justify-between hover:bg-slate-900/10">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-white">{u.student.full_name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">Roll: {u.student.roll_number}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded px-2.5 py-0.5 text-[10px] font-medium border ${
                          u.status === 'failed' 
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                            : 'bg-slate-800 text-slate-500 border-transparent'
                        }`}>
                          {u.status === 'failed' ? 'Failed Attempt' : 'Unattempted'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-500 italic">All active target year students cleared this exercise!</div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {activeTab === 'students' && (
        <div className="glass-card p-6 border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">Student Directory Roster</h3>
              <p className="text-xs text-slate-400 font-light mt-0.5">Add student credentials manually here to grant them access instantly.</p>
            </div>
            
            <div className="flex items-center gap-3.5">
              {/* Year filter for Roster table */}
              <div className="relative">
                <select
                  value={rosterYearFilter}
                  onChange={(e) => setRosterYearFilter(e.target.value as any)}
                  className="glass-input text-xs py-2 bg-slate-950 text-slate-300 cursor-pointer min-w-[130px]"
                >
                  <option value="all">All Years</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                </select>
              </div>

              <button
                onClick={() => handleOpenStudentModal()}
                className="inline-flex items-center gap-1 px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow transition-all"
              >
                <Plus className="h-4 w-4" /> Add Student
              </button>
            </div>
          </div>

          <div className="border border-slate-900 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-slate-800 text-left text-xs text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 font-bold">
                <tr>
                  <th className="px-4 py-3">Roll Number</th>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Year of Study</th>
                  <th className="px-4 py-3">Active Password</th>
                  <th className="px-4 py-3">First Login Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-950/20">
                {students.filter(s => rosterYearFilter === 'all' || String(s.year) === rosterYearFilter).length > 0 ? (
                  students.filter(s => rosterYearFilter === 'all' || String(s.year) === rosterYearFilter).map(s => (
                    <tr key={s.id} className="hover:bg-slate-900/10">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-200">{s.roll_number}</td>
                      <td className="px-4 py-3 font-semibold text-white">{s.full_name}</td>
                      <td className="px-4 py-3 font-semibold text-indigo-400">
                        {s.year === 2 ? '2nd Year (Java)' : '3rd Year (AJ)'}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">{s.password}</td>
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
                          className="px-2.5 py-1 text-[10.5px] rounded bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-850 cursor-pointer"
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
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic">No student accounts registered for the filtered year.</td>
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
              <p className="text-xs text-slate-400 font-light mt-0.5">Manage tasks in the syllabus. Changes propagate immediately to student modules based on Year.</p>
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
                  <th className="px-4 py-3">Target Year</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Scheduled Timings (Start - End)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-950/20">
                {tasks.length > 0 ? (
                  tasks.map(t => (
                    <tr key={t.id} className="hover:bg-slate-900/10">
                      <td className="px-4 py-3 font-semibold text-slate-200">Unit {t.unit_number}</td>
                      <td className="px-4 py-3 font-semibold text-white">{t.title}</td>
                      <td className="px-4 py-3 font-semibold text-indigo-400">
                        {t.year === 2 ? '2nd Year (Java)' : '3rd Year (AJ)'}
                      </td>
                      <td className="px-4 py-3 capitalize">{t.type.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-slate-400 font-light text-[11px] leading-relaxed">
                        {t.start_time ? (
                          <>
                            <div>Start: {new Date(t.start_time).toLocaleString()}</div>
                            <div>End: {new Date(t.end_time).toLocaleString()}</div>
                          </>
                        ) : (
                          'No timer configured'
                        )}
                      </td>
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
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic">No exercises created yet. Click Add Task above.</td>
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
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Roll Number (Login Username)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS2026101"
                  value={studentRoll}
                  onChange={(e) => setStudentRoll(e.target.value)}
                  className="w-full glass-input text-xs font-mono text-indigo-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Year of Study</label>
                  <select
                    value={studentYear}
                    onChange={(e) => setStudentYear(Number(e.target.value))}
                    className="w-full glass-input text-xs bg-slate-950 text-slate-300 cursor-pointer"
                  >
                    <option value={2}>2nd Year (Java)</option>
                    <option value={3}>3rd Year (AJ)</option>
                  </select>
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
                </div>
              </div>
              {!editingStudent && (
                <span className="text-[9px] text-slate-500 leading-none block">Default temp password. Enforces password change on login.</span>
              )}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-2">
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

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Student Year</label>
                  <select
                    value={taskYear}
                    onChange={(e) => setTaskYear(Number(e.target.value))}
                    className="w-full glass-input text-xs bg-slate-950 text-slate-300 cursor-pointer"
                  >
                    <option value={2}>2nd Year (Java)</option>
                    <option value={3}>3rd Year (Advanced Java)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Problem Description</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Summarize the learning objective and requirements..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full glass-input text-xs resize-none"
                />
              </div>

              {/* TIMING CONFIGURATION FIELDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-b border-slate-900 py-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Scheduled Start Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={taskStartTime}
                    onChange={(e) => setTaskStartTime(e.target.value)}
                    className="w-full glass-input text-xs bg-slate-950 text-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Scheduled End Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={taskEndTime}
                    onChange={(e) => setTaskEndTime(e.target.value)}
                    className="w-full glass-input text-xs bg-slate-950 text-slate-300"
                  />
                </div>
              </div>

              {/* RENDER FORMS BASED ON TASK TYPE */}
              {taskType === 'quiz' && (
                <div className="border border-slate-900 rounded-lg p-4 space-y-4 bg-slate-950/20 max-h-[250px] overflow-y-auto">
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
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Starter Java Code</label>
                    <textarea
                      rows={4}
                      placeholder="public class Main { ..."
                      value={taskStarter}
                      onChange={(e) => setTaskStarter(e.target.value)}
                      className="w-full glass-input font-mono text-[11px] resize-none leading-normal"
                    />
                  </div>

                  {/* MULTIPLE TEST CASES BUILDER */}
                  <div className="border border-slate-900 rounded-lg p-4 space-y-4 bg-slate-950/20 max-h-[250px] overflow-y-auto">
                    <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Coding Test Cases ({codingTestCases.length})</span>
                      <button
                        type="button"
                        onClick={addTestCase}
                        className="inline-flex items-center gap-1 text-[10.5px] text-indigo-400 font-semibold cursor-pointer hover:text-indigo-300"
                      >
                        <PlusCircle className="h-3.5 w-3.5" /> Add Test Case
                      </button>
                    </div>

                    {codingTestCases.map((tc, tcIdx) => (
                      <div key={tcIdx} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/40 p-3 rounded border border-slate-900/60 relative">
                        {codingTestCases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTestCase(tcIdx)}
                            className="absolute top-2 right-2 text-slate-600 hover:text-rose-400 cursor-pointer"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        )}
                        
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-semibold uppercase text-slate-500">Test Input (stdin) #{tcIdx + 1}</label>
                          <input
                            type="text"
                            placeholder="Stdin input parameters (leave blank if none)..."
                            value={tc.input}
                            onChange={(e) => handleTestCaseChange(tcIdx, 'input', e.target.value)}
                            className="w-full glass-input text-[11px] py-1.5 font-mono"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-semibold uppercase text-slate-500">Expected Output #{tcIdx + 1}</label>
                          <input
                            type="text"
                            required
                            placeholder="Expected console output mismatch print..."
                            value={tc.expected}
                            onChange={(e) => handleTestCaseChange(tcIdx, 'expected', e.target.value)}
                            className="w-full glass-input text-[11px] py-1.5 font-mono text-emerald-400"
                          />
                        </div>
                      </div>
                    ))}
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
                    Grading: <span className="font-semibold text-white">{(selectedSub.profiles || {}).full_name}</span> (Roll: {(selectedSub.profiles || {}).roll_number || 'N/A'} | Year: {(selectedSub.profiles || {}).year || 'N/A'})
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
                className="rounded border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-300 px-4 py-2 text-xs font-semibold cursor-pointer"
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
