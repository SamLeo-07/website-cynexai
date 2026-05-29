import React, { useState, useEffect } from 'react';
import { 
  Course, CourseCurriculum, updateCourse, getBatches, getUsers, User, Batch, 
  createBatch, deleteBatch, updateUser, getMockTests, MockTest, createMockTest, 
  deleteMockTest, getQuestions, addQuestion, getTestResults, getDailyRecordings, 
  createDailyRecording, deleteDailyRecording, getAttendanceSessions, 
  createAttendanceSession, deleteAttendanceSession, getAttendanceRecordsBySession,
  AttendanceSession, DailyRecording, Question, TestResult
} from '../lib/turso';
import { 
  BookOpen, Plus, Save, X, Users, BookMarked, Trash2, Video, 
  ClipboardList, HelpCircle, CheckCircle2, AlertCircle, Clock, 
  KeyRound, Calendar, Edit2, PlayCircle, PlusCircle, ArrowRight, Download 
} from 'lucide-react';

interface AdminCourseManagerProps {
  courses: Course[];
}

export const AdminCourseManager: React.FC<AdminCourseManagerProps> = ({ courses }) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [subTab, setSubTab] = useState<'curriculum' | 'sections' | 'recordings' | 'mocktests' | 'attendance'>('curriculum');

  const exportToCSV = (data: any[], filename: string, headers?: string[]) => {
    if (!data || !data.length) {
      alert("No data available to download");
      return;
    }
    const keys = Object.keys(data[0]);
    const displayHeaders = headers || keys;
    const csvRows = [];
    csvRows.push(displayHeaders.map(header => `"${String(header).replace(/"/g, '""')}"`).join(','));
    for (const row of data) {
      const values = keys.map(key => {
        const val = row[key];
        const strVal = val === null || val === undefined ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${strVal.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadCurriculum = () => {
    const course = courses.find(c => c.id === selectedCourseId);
    const courseTitle = course ? course.title : 'course';
    const data = curriculum.days.map(d => ({
      Day: d.dayNumber,
      Date: d.date || 'N/A',
      Concept: d.concept,
      Material: d.material,
      Assignment: d.assignment
    }));
    exportToCSV(data, `${courseTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_curriculum.csv`, ['Day', 'Scheduled Date', 'Concept', 'Learning Material', 'Assignment']);
  };

  // Curriculum builder state
  const [curriculum, setCurriculum] = useState<CourseCurriculum>({
    days: [],
    weeklyTests: [],
    tips: [],
    tools: [],
    subConcepts: []
  });
  const [saving, setSaving] = useState(false);

  // Batches (Sections) & Students state
  const [allBatches, setAllBatches] = useState<Batch[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [newBatchName, setNewBatchName] = useState<string>('');
  const [creatingBatch, setCreatingBatch] = useState(false);

  // Recordings state
  const [allRecordings, setAllRecordings] = useState<DailyRecording[]>([]);
  const [isRecModalOpen, setIsRecModalOpen] = useState(false);
  const [recForm, setRecForm] = useState({
    batch_id: '',
    subject: 'Python',
    title: '',
    description: '',
    video_url: '',
    duration: '1h 30m',
    recording_date: new Date().toISOString().split('T')[0]
  });
  const [savingRecording, setSavingRecording] = useState(false);

  // Mock Tests state
  const [mockTests, setMockTests] = useState<MockTest[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  
  const [testForm, setTestForm] = useState({
    title: '',
    description: '',
    duration: 60,
    category: 'Technical',
    totalQuestions: 10,
    isActive: true
  });
  
  const [questionForm, setQuestionForm] = useState({
    text: '',
    difficulty: 'easy' as 'easy' | 'medium' | 'hard',
    type: 'mcq' as 'mcq' | 'coding',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    // Coding-specific fields
    boilerplate: '// Write your solution here\nfunction solution() {\n  \n}',
    inputFormat: '',
    outputFormat: '',
    constraints: '',
    sampleInput: '',
    sampleOutput: '',
    testCasesList: [{ input: '', expected: '' }]
  });
  const [savingTest, setSavingTest] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);

  // Attendance state
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({
    topic: '',
    session_date: new Date().toISOString().split('T')[0],
    pin_code: '1234',
    batch_name: '',
    session_time: '10:00 AM'
  });
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Feedback states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load all data
  const loadData = async () => {
    try {
      const [batchesList, usersList, mockTestsList, recordingsList, sessionsList, resultsList] = await Promise.all([
        getBatches(),
        getUsers(),
        getMockTests(),
        getDailyRecordings(),
        getAttendanceSessions(selectedCourseId || undefined),
        getTestResults()
      ]);
      setAllBatches(batchesList);
      setAllStudents(usersList.filter(u => u.role === 'student'));
      setMockTests(mockTestsList);
      setAllRecordings(recordingsList);
      setAttendanceSessions(sessionsList);
      setTestResults(resultsList);
    } catch (e) {
      console.error("Failed to load operational data in AdminCourseManager", e);
      setError("Failed to load database records.");
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCourseId]);

  // Load questions for selected test
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!selectedTestId) {
        setQuestions([]);
        return;
      }
      try {
        const q = await getQuestions(selectedTestId, true);
        setQuestions(q);
      } catch (e) {
        console.error(e);
      }
    };
    fetchQuestions();
  }, [selectedTestId]);

  // Auto-fill course curriculum when selected course changes
  useEffect(() => {
    if (selectedCourseId) {
      const course = courses.find(c => c.id === selectedCourseId);
      if (course) {
        if (course.curriculum) {
          try {
            const parsed = typeof course.curriculum === 'string' ? JSON.parse(course.curriculum) : course.curriculum;
            setCurriculum({
              days: parsed.days || [],
              weeklyTests: parsed.weeklyTests || [],
              tips: parsed.tips || [],
              tools: parsed.tools || [],
              subConcepts: parsed.subConcepts || []
            });
          } catch (e) {
            setCurriculum({ days: [], weeklyTests: [], tips: [], tools: [], subConcepts: [] });
          }
        } else {
          setCurriculum({ days: [], weeklyTests: [], tips: [], tools: [], subConcepts: [] });
        }
      }
      
      // Auto pre-fill forms with first batch
      const batchesForCourse = allBatches.filter(b => b.course_id === selectedCourseId);
      if (batchesForCourse.length > 0) {
        setRecForm(prev => ({ ...prev, batch_id: batchesForCourse[0].id }));
        setAttendanceForm(prev => ({ ...prev, batch_name: batchesForCourse[0].name }));
      }
    } else {
      setCurriculum({ days: [], weeklyTests: [], tips: [], tools: [], subConcepts: [] });
    }
  }, [selectedCourseId, courses, allBatches]);

  // --- Curriculum Actions ---
  const handleSaveCurriculum = async () => {
    if (!selectedCourseId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const course = courses.find(c => c.id === selectedCourseId);
    if (!course) return;

    try {
      await updateCourse({
        ...course,
        curriculum: JSON.stringify(curriculum)
      });
      setSuccess('Curriculum saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      console.error(e);
      setError('Failed to save curriculum.');
    } finally {
      setSaving(false);
    }
  };

  // --- Section/Batch Actions ---
  const handleCreateBatch = async () => {
    if (!newBatchName.trim() || !selectedCourseId) return;
    setCreatingBatch(true);
    try {
      const created: Batch = {
        id: `batch_${Date.now()}`,
        name: newBatchName.trim(),
        course_id: selectedCourseId
      };
      await createBatch(created);
      setNewBatchName('');
      setSuccess('Section created successfully!');
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      console.error(e);
      setError('Failed to create section.');
    } finally {
      setCreatingBatch(false);
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!window.confirm('Are you sure you want to delete this batch/section? All recordings inside it will be deleted!')) return;
    try {
      await deleteBatch(batchId);
      setSuccess('Section deleted successfully!');
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      console.error(e);
      setError('Failed to delete section.');
    }
  };

  const handleAssignStudent = async (batchId: string, student: User) => {
    try {
      const updated: User = { ...student, batch_id: batchId };
      await updateUser(updated);
      await loadData();
      setSuccess(`Assigned ${student.name} to section.`);
      setTimeout(() => setSuccess(null), 2500);
    } catch (e) {
      console.error(e);
      setError('Failed to assign student.');
    }
  };

  const handleRemoveStudent = async (student: User) => {
    try {
      const updated: User = { ...student, batch_id: '' };
      await updateUser(updated);
      await loadData();
      setSuccess(`Removed ${student.name} from section.`);
      setTimeout(() => setSuccess(null), 2500);
    } catch (e) {
      console.error(e);
      setError('Failed to deallocate student.');
    }
  };

  // --- Class Recordings Actions ---
  const handleCreateRecording = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recForm.batch_id || !recForm.title.trim() || !recForm.video_url.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setSavingRecording(true);
    try {
      const created: DailyRecording = {
        id: `rec_${Date.now()}`,
        batch_id: recForm.batch_id,
        subject: recForm.subject,
        title: recForm.title.trim(),
        description: recForm.description.trim() || undefined,
        video_url: recForm.video_url.trim(),
        duration: recForm.duration || '1h 30m',
        recording_date: recForm.recording_date
      };
      await createDailyRecording(created);
      setIsRecModalOpen(false);
      setRecForm({
        batch_id: allBatches.filter(b => b.course_id === selectedCourseId)[0]?.id || '',
        subject: 'Python',
        title: '',
        description: '',
        video_url: '',
        duration: '1h 30m',
        recording_date: new Date().toISOString().split('T')[0]
      });
      setSuccess('Class recording uploaded!');
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      console.error(e);
      setError('Failed to save recording.');
    } finally {
      setSavingRecording(false);
    }
  };

  const handleDeleteRecording = async (id: string) => {
    if (!window.confirm('Delete this class recording?')) return;
    try {
      await deleteDailyRecording(id);
      setSuccess('Recording deleted.');
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      console.error(e);
      setError('Failed to delete recording.');
    }
  };

  // --- Mock Test Actions ---
  const handleCreateMockTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testForm.title.trim() || !selectedCourseId) return;

    setSavingTest(true);
    try {
      const newTestId = `test_${Date.now()}`;
      await createMockTest({
        id: newTestId,
        title: testForm.title.trim(),
        description: testForm.description.trim(),
        duration: testForm.duration,
        category: testForm.category,
        totalQuestions: testForm.totalQuestions,
        isActive: testForm.isActive,
        course_id: selectedCourseId
      });
      setIsTestModalOpen(false);
      setTestForm({
        title: '', description: '', duration: 60, category: 'Technical', totalQuestions: 10, isActive: true
      });
      setSelectedTestId(newTestId);
      setSuccess('Mock Test created! You can now add questions to it.');
      await loadData();
      setTimeout(() => setSuccess(null), 4000);
    } catch (e) {
      console.error(e);
      setError('Failed to create test.');
    } finally {
      setSavingTest(false);
    }
  };

  const handleDeleteMockTest = async (id: string) => {
    if (!window.confirm('Delete this mock test and all its questions?')) return;
    try {
      await deleteMockTest(id);
      setSuccess('Mock test deleted.');
      if (selectedTestId === id) setSelectedTestId(null);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      console.error(e);
      setError('Failed to delete test.');
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTestId || !questionForm.text.trim()) return;

    if (questionForm.type === 'mcq') {
      const filledOptions = questionForm.options.filter(o => o.trim());
      if (filledOptions.length < 2) {
        setError('Please fill in at least 2 answer options.');
        return;
      }
    }

    setSavingQuestion(true);
    try {
      const newQuestion: Question = {
        id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        testId: selectedTestId,
        text: questionForm.text.trim(),
        difficulty: questionForm.difficulty,
        type: questionForm.type,
        explanation: questionForm.explanation.trim() || undefined,
        isApproved: true,
        // MCQ fields
        options: questionForm.type === 'mcq' ? questionForm.options.filter(o => o.trim()) : undefined,
        correctAnswer: questionForm.type === 'mcq' ? questionForm.correctAnswer : undefined,
        // Coding fields
        boilerplate: questionForm.type === 'coding' ? questionForm.boilerplate.trim() : undefined,
        inputFormat: questionForm.type === 'coding' ? questionForm.inputFormat.trim() || undefined : undefined,
        outputFormat: questionForm.type === 'coding' ? questionForm.outputFormat.trim() || undefined : undefined,
        constraints: questionForm.type === 'coding' ? questionForm.constraints.trim() || undefined : undefined,
        sampleInput: questionForm.type === 'coding' ? questionForm.sampleInput.trim() || undefined : undefined,
        sampleOutput: questionForm.type === 'coding' ? questionForm.sampleOutput.trim() || undefined : undefined,
        testCases: questionForm.type === 'coding'
          ? JSON.stringify(questionForm.testCasesList
              .filter(tc => tc.input.trim() || tc.expected.trim())
              .map(tc => ({ input: tc.input.trim(), expected_output: tc.expected.trim() })))
          : undefined,
      };
      await addQuestion(newQuestion);
      setQuestions([...questions, newQuestion]);
      setIsQuestionModalOpen(false);
      setQuestionForm({
        text: '', difficulty: 'easy', type: 'mcq',
        options: ['', '', '', ''], correctAnswer: 0, explanation: '',
        boilerplate: '// Write your solution here\nfunction solution() {\n  \n}',
        inputFormat: '', outputFormat: '', constraints: '',
        sampleInput: '', sampleOutput: '', testCasesList: [{ input: '', expected: '' }]
      });
      setSuccess('Question added successfully!');
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      console.error(e);
      setError('Failed to add question.');
    } finally {
      setSavingQuestion(false);
    }
  };

  // --- Attendance Actions ---
  const handleCreateAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendanceForm.topic.trim() || !selectedCourseId) return;

    setSavingAttendance(true);
    try {
      const newSession: AttendanceSession = {
        id: `sess_${Date.now()}`,
        course_id: selectedCourseId,
        session_date: attendanceForm.session_date,
        topic: attendanceForm.topic.trim(),
        pin_code: attendanceForm.pin_code,
        created_by: 'admin',
        created_at: new Date().toISOString(),
        batch_name: attendanceForm.batch_name || undefined,
        session_time: attendanceForm.session_time || undefined
      };
      await createAttendanceSession(newSession);
      setIsAttendanceModalOpen(false);
      setAttendanceForm(prev => ({
        ...prev,
        topic: '',
        pin_code: '1234',
        session_date: new Date().toISOString().split('T')[0]
      }));
      setSuccess('Attendance session passcode active!');
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      console.error(e);
      setError('Failed to create attendance session.');
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleDeleteAttendance = async (id: string) => {
    if (!window.confirm('Delete this attendance session passcode?')) return;
    try {
      await deleteAttendanceSession(id);
      setSuccess('Session deleted.');
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      console.error(e);
      setError('Failed to delete attendance session.');
    }
  };

  // Filter collections by course
  const courseBatches = allBatches.filter(b => b.course_id === selectedCourseId);
  const courseMockTests = mockTests.filter(t => t.course_id === selectedCourseId);
  const courseRecordings = allRecordings.filter(r => courseBatches.some(b => b.id === r.batch_id));
  const courseSessions = attendanceSessions.filter(s => s.course_id === selectedCourseId);

  const getBatchStudents = (batchId: string) => {
    return allStudents.filter(s => s.batch_id === batchId);
  };

  const getBatchName = (batchId: string) => {
    return allBatches.find(b => b.id === batchId)?.name || batchId;
  };

  return (
    <div className="space-y-8 text-white selection:bg-indigo-500/20">
      <div>
        <h3 className="text-3xl font-bold tracking-tight text-white mb-2">Course Master Control</h3>
        <p className="text-sm text-gray-400 font-medium">Manage curriculum, batches, recordings, quizzes, and class attendance in a single interface.</p>
      </div>

      {/* Alerts */}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <p className="text-sm text-emerald-200 font-medium">{success}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-sm text-red-200 font-medium">{error}</p>
        </div>
      )}

      {/* Main Course Selector */}
      <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-xl shadow-sm">
        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Select Course to Manage</label>
        <select
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="w-full bg-[#0a0a0a] border border-slate-700 rounded-md px-4 py-2.5 text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none mb-6 cursor-pointer text-sm"
        >
          <option value="">-- Select a Course --</option>
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>

        {selectedCourseId && (
          <div>
            {/* Sub-tab Navigation */}
            <div className="flex flex-wrap border-b border-slate-800 mb-8 gap-6">
              {[
                { id: 'curriculum', label: 'Curriculum Builder', icon: BookOpen },
                { id: 'sections', label: 'Sections & Students', icon: Users },
                { id: 'recordings', label: 'Class Recordings', icon: Video },
                { id: 'mocktests', label: 'Mock Tests & Quizzes', icon: ClipboardList },
                { id: 'attendance', label: 'Attendance Tracker', icon: Clock }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSubTab(tab.id as any)}
                  className={`pb-3 font-semibold text-sm transition-colors border-b-2 -mb-[2px] flex items-center gap-2 ${
                    subTab === tab.id 
                      ? 'border-indigo-500 text-indigo-400' 
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* CURRICULUM TAB */}
            {subTab === 'curriculum' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-indigo-400" /> Advanced Curriculum Builder
                    </h4>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDownloadCurriculum}
                        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-md text-sm flex items-center gap-2 transition-colors shadow-sm"
                      >
                        <Download className="w-4 h-4" /> Download Curriculum
                      </button>
                      <button
                        onClick={handleSaveCurriculum}
                        disabled={saving}
                        className="px-5 py-2.5 bg-white text-black font-semibold rounded-md text-sm flex items-center gap-2 hover:bg-slate-200 transition-colors shadow-sm disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Curriculum'}
                      </button>
                    </div>
                  </div>

                  {/* Daily Schedule */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-semibold text-white">Daily Schedule</h5>
                      <button type="button" onClick={() => {
                        setCurriculum(prev => ({
                          ...prev,
                          days: [...prev.days, { dayNumber: prev.days.length + 1, concept: '', material: '', assignment: '', date: '' }]
                        }));
                      }} className="flex items-center gap-2 px-3 py-1.5 bg-[#0a0a0a] border border-slate-700 text-slate-200 rounded-md text-xs font-medium hover:border-slate-500 transition-colors shadow-sm">
                        <Calendar size={14} /> Add Day
                      </button>
                    </div>
                    <div className="space-y-3">
                      {curriculum.days.map((day, i) => (
                        <div key={i} className="bg-[#0a0a0a] rounded-lg p-4 border border-slate-800 space-y-3 relative group">
                          <button type="button" onClick={() => {
                            setCurriculum(prev => {
                              const newDays = prev.days.filter((_, idx) => idx !== i).map((d, idx) => ({ ...d, dayNumber: idx + 1 }));
                              return { ...prev, days: newDays };
                            });
                          }} className="absolute top-3 right-3 p-1.5 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                            <X size={16} />
                          </button>
                          <div className="flex items-center gap-4">
                            <h6 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Day {day.dayNumber}</h6>
                            <input type="date" value={day.date || ''} onChange={(e) => {
                              setCurriculum(prev => {
                                const newDays = [...prev.days];
                                newDays[i].date = e.target.value;
                                return { ...prev, days: newDays };
                              });
                            }} className="px-2 py-1 bg-[#0f172a] border border-slate-700 rounded text-[11px] text-slate-300 outline-none focus:border-indigo-500 transition-colors" title="Scheduled Date" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <input type="text" placeholder="Concept (e.g. Intro to Python)" value={day.concept} onChange={(e) => {
                              setCurriculum(prev => {
                                const newDays = [...prev.days];
                                newDays[i].concept = e.target.value;
                                return { ...prev, days: newDays };
                              });
                            }} className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 rounded-md text-sm text-slate-200 outline-none focus:border-indigo-500 placeholder:text-slate-600 transition-colors" />
                            <input type="text" placeholder="Material (Link or Text)" value={day.material} onChange={(e) => {
                              setCurriculum(prev => {
                                const newDays = [...prev.days];
                                newDays[i].material = e.target.value;
                                return { ...prev, days: newDays };
                              });
                            }} className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 rounded-md text-sm text-slate-200 outline-none focus:border-indigo-500 placeholder:text-slate-600 transition-colors" />
                            {courseMockTests.length > 0 ? (
                              <select value={day.assignment} onChange={(e) => {
                                setCurriculum(prev => {
                                  const newDays = [...prev.days];
                                  newDays[i].assignment = e.target.value;
                                  return { ...prev, days: newDays };
                                });
                              }} className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 rounded-md text-sm text-slate-200 outline-none focus:border-indigo-500 cursor-pointer">
                                <option value="">-- Link a Daily Test --</option>
                                {courseMockTests.map(t => <option key={t.id} value={t.id}>{t.title} ({t.category})</option>)}
                              </select>
                            ) : (
                              <input type="text" placeholder="Assignment (Test ID or Text)" value={day.assignment} onChange={(e) => {
                                setCurriculum(prev => {
                                  const newDays = [...prev.days];
                                  newDays[i].assignment = e.target.value;
                                  return { ...prev, days: newDays };
                                });
                              }} className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 rounded-md text-sm text-slate-200 outline-none focus:border-indigo-500 placeholder:text-slate-600 transition-colors" />
                            )}
                          </div>
                        </div>
                      ))}
                      {curriculum.days.length === 0 && (
                        <p className="text-xs text-slate-500 italic">No days scheduled yet. Add a day to start building.</p>
                      )}
                    </div>
                  </div>

                  {/* Other Curriculum fields */}
                  {['weeklyTests', 'tips', 'tools', 'subConcepts'].map((fieldStr) => {
                    const field = fieldStr as keyof Omit<CourseCurriculum, 'days'>;
                    const labels: Record<string, string> = { weeklyTests: 'Weekly Tests', tips: 'Pro Tips', tools: 'Required Tools', subConcepts: 'Sub-Concepts (Optional Division)' };
                    const placeholders: Record<string, string> = { weeklyTests: 'e.g., Week 1 Assessment', tips: 'e.g., Practice coding daily', tools: 'e.g., VS Code, Python 3', subConcepts: 'e.g., AI, ML, Data Science' };

                    return (
                      <div key={field} className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-semibold text-white">{labels[field]}</h5>
                          <div className="flex gap-2">
                            {field === 'weeklyTests' && (
                              <button type="button" onClick={() => setIsTestModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-md text-xs font-medium hover:bg-indigo-600/30 transition-colors">
                                <PlusCircle size={13} /> Create Test
                              </button>
                            )}
                            <button type="button" onClick={() => {
                              setCurriculum(prev => ({
                                ...prev,
                                [field]: [...prev[field], '']
                              }));
                            }} className="flex items-center gap-2 px-3 py-1.5 bg-[#0a0a0a] border border-slate-700 text-slate-200 rounded-md text-xs font-medium hover:border-slate-500 transition-colors shadow-sm">
                              <Plus size={14} /> Add
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {curriculum[field].map((val, i) => (
                            <div key={i} className="flex gap-2 group">
                              {field === 'weeklyTests' && courseMockTests.length > 0 ? (
                                <select
                                  value={val}
                                  onChange={(e) => {
                                    setCurriculum(prev => {
                                      const arr = [...prev.weeklyTests];
                                      arr[i] = e.target.value;
                                      return { ...prev, weeklyTests: arr };
                                    });
                                  }}
                                  className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-slate-700 rounded-md text-sm text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
                                  title="Link Test"
                                >
                                  <option value="">-- Link a database Mock Test --</option>
                                  {courseMockTests.map(t => (
                                    <option key={t.id} value={t.id}>{t.title} ({t.category})</option>
                                  ))}
                                </select>
                              ) : (
                                <input type="text" value={val} onChange={(e) => {
                                  setCurriculum(prev => {
                                    const arr = [...prev[field]];
                                    arr[i] = e.target.value;
                                    return { ...prev, [field]: arr };
                                  });
                                }} placeholder={placeholders[field]} className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-slate-700 rounded-md text-sm text-slate-200 outline-none focus:border-indigo-500 placeholder:text-slate-600 transition-colors" />
                              )}
                              <button type="button" onClick={() => {
                                setCurriculum(prev => {
                                  const arr = prev[field].filter((_, idx) => idx !== i);
                                  return { ...prev, [field]: arr };
                                });
                              }} className="p-2.5 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"><X size={16}/></button>
                            </div>
                          ))}
                          {field === 'weeklyTests' && courseMockTests.length === 0 && (
                            <p className="text-xs text-slate-500 italic">No mock tests configured for this course yet. Click "Create Test" above to build one inline.</p>
                          )}
                          {curriculum[field].length === 0 && (
                            <p className="text-xs text-slate-500 italic">None added.</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right side context panel */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-[#0a0a0a] border border-slate-800 rounded-xl p-5 space-y-4">
                    <h5 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                      <Users size={14} /> Sections assigned to Course
                    </h5>
                    {courseBatches.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No active batches.</p>
                    ) : (
                      <div className="space-y-2">
                        {courseBatches.map(b => (
                          <div key={b.id} className="flex justify-between items-center bg-slate-900/40 p-2.5 rounded border border-slate-800 text-xs">
                            <span className="font-semibold">{b.name}</span>
                            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{getBatchStudents(b.id).length} Students</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SECTIONS & STUDENTS TAB */}
            {subTab === 'sections' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-[#0a0a0a] border border-slate-800 rounded-xl p-6 space-y-4">
                    <h4 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                      <BookMarked className="w-4 h-4 text-indigo-400" /> Create Batch / Section
                    </h4>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Section Name (e.g. Section B)"
                        value={newBatchName}
                        onChange={(e) => setNewBatchName(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 rounded-md text-sm text-slate-200 outline-none focus:border-indigo-500 placeholder:text-slate-600"
                      />
                      <button
                        onClick={handleCreateBatch}
                        disabled={creatingBatch || !newBatchName.trim()}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md text-xs uppercase tracking-wider transition-colors disabled:opacity-50 shadow-md"
                      >
                        {creatingBatch ? 'Creating...' : 'Create Batch'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Batches & Cohorts ({courseBatches.length})</h4>
                  {courseBatches.length === 0 ? (
                    <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center text-slate-500">
                      Create your first batch on the left to begin allocating students.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {courseBatches.map(batch => {
                        const studentsInBatch = getBatchStudents(batch.id);
                        return (
                          <div key={batch.id} className="border border-slate-800 rounded-xl p-5 bg-[#0a0a0a] hover:border-slate-700 transition-all flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                                <span className="font-bold text-sm text-white">{batch.name}</span>
                                <button onClick={() => handleDeleteBatch(batch.id)} className="p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded transition-colors" title="Delete Section">
                                  <Trash2 size={14} />
                                </button>
                              </div>

                              {studentsInBatch.length > 0 ? (
                                <ul className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                                  {studentsInBatch.map(student => (
                                    <li key={student.id} className="text-[11px] text-slate-400 flex items-center justify-between gap-2 p-2 bg-slate-900/40 border border-slate-800/50 rounded hover:border-slate-800 transition-colors">
                                      <div className="flex flex-col min-w-0">
                                        <span className="font-semibold text-slate-200 truncate">{student.name}</span>
                                        <span className="text-slate-500 truncate text-[10px]">{student.email}</span>
                                      </div>
                                      <button onClick={() => handleRemoveStudent(student)} className="p-1 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded shrink-0" title="Remove from batch">
                                        <X size={12} />
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-[10px] text-slate-500 italic py-4 text-center">No students allocated to this section.</p>
                              )}
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-800/80">
                              <select
                                value=""
                                onChange={(e) => {
                                  const sId = e.target.value;
                                  if (!sId) return;
                                  const student = allStudents.find(s => s.id === sId);
                                  if (student) handleAssignStudent(batch.id, student);
                                }}
                                className="w-full bg-[#0f172a] border border-slate-700 rounded px-2.5 py-1.5 text-[11px] text-slate-300 outline-none focus:border-indigo-500 cursor-pointer"
                                title="Assign student"
                              >
                                <option value="">+ Assign Student to Section</option>
                                {allStudents
                                  .filter(s => s.batch_id !== batch.id)
                                  .map(s => (
                                    <option key={s.id} value={s.id}>
                                      {s.name} ({s.batch_id ? getBatchName(s.batch_id) : 'Unassigned'})
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CLASS RECORDINGS TAB */}
            {subTab === 'recordings' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Class Recording Vault ({courseRecordings.length})</h4>
                  <button 
                    disabled={courseBatches.length === 0}
                    onClick={() => setIsRecModalOpen(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded text-xs uppercase tracking-wider transition-colors shadow-md flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Upload Recording
                  </button>
                </div>

                {courseBatches.length === 0 ? (
                  <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center text-slate-500">
                    You must create at least one section/batch first to upload class recordings.
                  </div>
                ) : courseRecordings.length === 0 ? (
                  <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center text-slate-500">
                    No recordings uploaded for this course yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {courseRecordings.map(rec => (
                      <div key={rec.id} className="bg-[#0a0a0a] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[9px] font-black uppercase tracking-wider">{rec.subject}</span>
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[9px] font-bold">{getBatchName(rec.batch_id)}</span>
                          </div>
                          <h5 className="font-bold text-white text-base leading-snug">{rec.title}</h5>
                          {rec.description && <p className="text-xs text-slate-400 line-clamp-2">{rec.description}</p>}
                          <div className="flex items-center gap-4 text-[10px] text-slate-500 font-semibold pt-1">
                            <span className="flex items-center gap-1"><Calendar size={12} /> {rec.recording_date}</span>
                            <span className="flex items-center gap-1"><Clock size={12} /> {rec.duration}</span>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-slate-800/80 pt-3">
                          <a href={rec.video_url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-400 rounded transition-colors" title="Play Video">
                            <PlayCircle size={16} />
                          </a>
                          <button onClick={() => handleDeleteRecording(rec.id)} className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded transition-colors" title="Delete Recording">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MOCK TESTS & QUIZZES TAB */}
            {subTab === 'mocktests' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left pane: Tests list */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Mock Tests ({courseMockTests.length})</h4>
                    <button onClick={() => setIsTestModalOpen(true)} className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors" title="Create Test">
                      <Plus size={14} />
                    </button>
                  </div>

                  {courseMockTests.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-4">No tests configured. Click "+" to create one.</p>
                  ) : (
                    <div className="space-y-2">
                      {courseMockTests.map(t => (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTestId(t.id)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${
                            selectedTestId === t.id 
                              ? 'border-indigo-500 bg-indigo-500/10' 
                              : 'border-slate-800 bg-[#0a0a0a] hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <h5 className="font-bold text-sm text-slate-100">{t.title}</h5>
                            <span className="text-[10px] text-slate-400">{t.duration}m Â· {t.category}</span>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteMockTest(t.id); }}
                            className="p-1 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right pane: Selected test details (questions & results) */}
                <div className="lg:col-span-2 space-y-6">
                  {selectedTestId ? (
                    (() => {
                      const test = mockTests.find(t => t.id === selectedTestId);
                      const resultsForTest = testResults.filter(r => r.testId === selectedTestId);
                      if (!test) return null;

                      return (
                        <div className="space-y-8">
                          {/* Test Header */}
                          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                            <div>
                              <h4 className="text-lg font-bold text-white">{test.title}</h4>
                              <p className="text-xs text-slate-400 mt-1">{test.description || 'No description configured.'}</p>
                            </div>
                            <button onClick={() => setIsQuestionModalOpen(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs uppercase tracking-wider shadow-md">
                              + Add Question
                            </button>
                          </div>

                          {/* Questions List */}
                          <div>
                            <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Questions ({questions.length})</h5>
                            {questions.length === 0 ? (
                              <p className="text-xs text-slate-500 italic p-4 bg-[#0a0a0a] border border-slate-800 rounded">No questions added yet. Click "+ Add Question" above.</p>
                            ) : (
                              <div className="space-y-3">
                                {questions.map((q, idx) => (
                                  <div key={q.id} className="bg-[#0a0a0a] border border-slate-850 rounded-xl p-4 space-y-3">
                                    <div className="flex gap-2 items-start">
                                      <span className="text-xs font-semibold text-slate-500">{idx + 1}.</span>
                                      <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded text-[9px] font-black uppercase tracking-wider">{q.difficulty}</span>
                                          <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded text-[9px] font-black uppercase tracking-wider">{q.type}</span>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-200">{q.text}</p>
                                      </div>
                                    </div>
                                    {q.options && (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-4">
                                        {q.options.map((opt, oIdx) => (
                                          <div key={oIdx} className={`px-3 py-1.5 rounded border text-xs ${
                                            oIdx === q.correctAnswer 
                                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' 
                                              : 'border-slate-800 bg-[#0c0c0c] text-slate-400'
                                          }`}>
                                            {String.fromCharCode(65 + oIdx)}. {opt}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Student Results */}
                          <div>
                            <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Student Performance ({resultsForTest.length})</h5>
                            {resultsForTest.length === 0 ? (
                              <p className="text-xs text-slate-500 italic p-4 bg-[#0a0a0a] border border-slate-800 rounded">No submission records yet.</p>
                            ) : (
                              <div className="bg-[#0a0a0a] border border-slate-800 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-black tracking-wider">
                                    <tr>
                                      <th className="p-3 pl-5">Student</th>
                                      <th className="p-3">Score</th>
                                      <th className="p-3">Percentage</th>
                                      <th className="p-3">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-850">
                                    {resultsForTest.map(r => (
                                      <tr key={r.id} className="hover:bg-slate-950/40">
                                        <td className="p-3 pl-5 font-semibold">{r.studentName}</td>
                                        <td className="p-3 font-mono">{r.score}/{r.totalQuestions}</td>
                                        <td className="p-3 font-semibold">{r.percentage}%</td>
                                        <td className="p-3">
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                            r.percentage >= 70 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                          }`}>
                                            {r.percentage >= 70 ? 'Pass' : 'Fail'}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="p-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      Select a Mock Test from the list to manage questions and view performance reports.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ATTENDANCE TRACKER TAB */}
            {subTab === 'attendance' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Attendance Session Passcodes ({courseSessions.length})</h4>
                  <button 
                    onClick={() => setIsAttendanceModalOpen(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs uppercase tracking-wider transition-colors shadow-md flex items-center gap-1.5"
                  >
                    <Plus size={14} /> New Session PIN
                  </button>
                </div>

                {courseSessions.length === 0 ? (
                  <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center text-slate-500">
                    No active attendance codes for this course yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courseSessions.map(sess => (
                      <div key={sess.id} className="bg-[#0a0a0a] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1"><KeyRound size={10} /> PIN Active</span>
                            <button onClick={() => handleDeleteAttendance(sess.id)} className="p-1 text-slate-500 hover:text-red-400 rounded" title="Delete PIN">
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <h5 className="font-bold text-white text-base leading-snug">{sess.topic}</h5>
                          <div className="text-slate-400 text-xs font-semibold space-y-1 pt-1.5">
                            <div className="flex items-center gap-1.5"><Calendar size={12} className="text-slate-500" /> {sess.session_date} {sess.session_time ? `@ ${sess.session_time}` : ''}</div>
                            {sess.batch_name && <div className="flex items-center gap-1.5"><Users size={12} className="text-slate-500" /> Target Batch: {sess.batch_name}</div>}
                          </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-lg flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Attendance Code</span>
                          <span className="text-base font-black text-indigo-400 font-mono tracking-widest">{sess.pin_code}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Daily Recording Modal */}
      {isRecModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div onClick={() => setIsRecModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative bg-[#0f172a] border border-slate-800 rounded-xl p-6 w-full max-w-xl shadow-2xl text-white">
            <button onClick={() => setIsRecModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-850 transition-all"><X size={16}/></button>
            <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Video size={18} className="text-indigo-400" /> Upload Batch Class Recording</h4>
            <form onSubmit={handleCreateRecording} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Batch/Section *</label>
                  <select
                    value={recForm.batch_id}
                    onChange={(e) => setRecForm({ ...recForm, batch_id: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-200"
                    title="Select Section"
                  >
                    <option value="" disabled>-- Select Section --</option>
                    {courseBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Subject *</label>
                  <select
                    value={recForm.subject}
                    onChange={(e) => setRecForm({ ...recForm, subject: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-200"
                    title="Select Subject"
                  >
                    <option value="Java">Java</option>
                    <option value="Python">Python</option>
                    <option value="SQL">SQL</option>
                    <option value="ML">Machine Learning</option>
                    <option value="PowerBI">PowerBI</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Recording Title *</label>
                <input
                  type="text" required value={recForm.title}
                  onChange={(e) => setRecForm({ ...recForm, title: e.target.value })}
                  placeholder="e.g. Python List Comprehensions Deep Dive"
                  className="w-full bg-[#0a0a0a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Video URL (YouTube or direct link) *</label>
                <input
                  type="text" required value={recForm.video_url}
                  onChange={(e) => setRecForm({ ...recForm, video_url: e.target.value })}
                  placeholder="e.g. https://www.youtube.com/watch?v=..."
                  className="w-full bg-[#0a0a0a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Duration</label>
                  <input
                    type="text" value={recForm.duration}
                    onChange={(e) => setRecForm({ ...recForm, duration: e.target.value })}
                    placeholder="e.g. 1h 45m"
                    className="w-full bg-[#0a0a0a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Recording Date *</label>
                  <input
                    type="date" required value={recForm.recording_date}
                    onChange={(e) => setRecForm({ ...recForm, recording_date: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Description</label>
                <textarea
                  rows={2} value={recForm.description}
                  onChange={(e) => setRecForm({ ...recForm, description: e.target.value })}
                  placeholder="Add brief details about the lecture..."
                  className="w-full bg-[#0a0a0a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 resize-none"
                />
              </div>
              <button
                type="submit" disabled={savingRecording}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded text-xs uppercase tracking-wider transition-colors shadow-md mt-2"
              >
                {savingRecording ? 'Saving Recording...' : 'Save & Publish Recording'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Test Modal */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div onClick={() => setIsTestModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative bg-[#0f172a] border border-slate-800 rounded-xl p-6 w-full max-w-lg shadow-2xl text-white">
            <button onClick={() => setIsTestModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-850 transition-all"><X size={16}/></button>
            <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><ClipboardList size={18} className="text-indigo-400" /> Create Mock Assessment</h4>
            <form onSubmit={handleCreateMockTest} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Test Title *</label>
                <input
                  type="text" required value={testForm.title}
                  onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                  placeholder="e.g. Python Foundations Final Exam"
                  className="w-full bg-[#0a0a0a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Description</label>
                <textarea
                  rows={2} value={testForm.description}
                  onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
                  placeholder="Assess syllabus scope, target topics..."
                  className="w-full bg-[#0a0a0a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 resize-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Duration (min)</label>
                  <input
                    type="number" min={1} value={testForm.duration}
                    onChange={(e) => setTestForm({ ...testForm, duration: parseInt(e.target.value) || 60 })}
                    className="w-full bg-[#0a0a0a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Questions</label>
                  <input
                    type="number" min={1} value={testForm.totalQuestions}
                    onChange={(e) => setTestForm({ ...testForm, totalQuestions: parseInt(e.target.value) || 10 })}
                    className="w-full bg-[#0a0a0a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Category</label>
                  <input
                    type="text" value={testForm.category}
                    onChange={(e) => setTestForm({ ...testForm, category: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox" id="test-active" checked={testForm.isActive}
                  onChange={(e) => setTestForm({ ...testForm, isActive: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="test-active" className="text-xs text-slate-300 font-medium cursor-pointer">Active (make visible to students immediately)</label>
              </div>
              <button
                type="submit" disabled={savingTest}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded text-xs uppercase tracking-wider transition-colors shadow-md mt-2"
              >
                {savingTest ? 'Saving Test...' : 'Save Mock Test'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Question Modal â€” MCQ + Coding */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div onClick={() => setIsQuestionModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto no-scrollbar">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  questionForm.type === 'coding' ? 'bg-violet-50' : 'bg-blue-50'
                }`}>
                  <HelpCircle size={16} className={questionForm.type === 'coding' ? 'text-violet-600' : 'text-blue-600'} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {questionForm.type === 'coding' ? 'Add Coding Question' : 'Add MCQ Question'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {questionForm.type === 'coding' ? 'Code challenge with test cases' : 'Multiple choice assessment question'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsQuestionModalOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleAddQuestion} className="px-6 py-5 space-y-5">

              {/* Question Type Toggle */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2">Question Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setQuestionForm({ ...questionForm, type: 'mcq' })}
                    className={`flex-1 py-2 rounded-xl border text-sm font-bold transition-all ${
                      questionForm.type === 'mcq'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    ðŸ“ MCQ
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionForm({ ...questionForm, type: 'coding' })}
                    className={`flex-1 py-2 rounded-xl border text-sm font-bold transition-all ${
                      questionForm.type === 'coding'
                        ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    ðŸ’» Coding
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Question <span className="text-red-400">*</span></label>
                <textarea
                  required
                  rows={3}
                  value={questionForm.text}
                  onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                  placeholder={questionForm.type === 'coding'
                    ? 'e.g. Write a function that returns the sum of two numbers.'
                    : 'e.g. Which keyword is used to define a function in Python?'}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>

              {/* Difficulty */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Difficulty Level</label>
                <select
                  value={questionForm.difficulty}
                  onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value as any })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                  title="Select Difficulty"
                >
                  <option value="easy">ðŸŸ¢ Easy</option>
                  <option value="medium">ðŸŸ¡ Medium</option>
                  <option value="hard">ðŸ”´ Hard</option>
                </select>
              </div>

              {/* ---- MCQ FIELDS ---- */}
              {questionForm.type === 'mcq' && (
                <>
                  {/* Correct Answer Selector */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">Correct Answer</label>
                    <select
                      value={questionForm.correctAnswer}
                      onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: parseInt(e.target.value) })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                      title="Correct Answer"
                    >
                      <option value={0}>Option A</option>
                      <option value={1}>Option B</option>
                      <option value={2}>Option C</option>
                      <option value={3}>Option D</option>
                    </select>
                  </div>

                  {/* Answer Options */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-2">Answer Options <span className="text-red-400">*</span></label>
                    <div className="space-y-2">
                      {questionForm.options.map((opt, i) => {
                        const isCorrect = questionForm.correctAnswer === i;
                        return (
                          <div key={i} className={`flex gap-2.5 items-center p-2.5 rounded-xl border transition-all ${
                            isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-slate-50'
                          }`}>
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                              isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                            }`}>
                              {String.fromCharCode(65 + i)}
                            </span>
                            <input
                              type="text"
                              required
                              value={opt}
                              onChange={(e) => {
                                const arr = [...questionForm.options];
                                arr[i] = e.target.value;
                                setQuestionForm({ ...questionForm, options: arr });
                              }}
                              placeholder={`Option ${String.fromCharCode(65 + i)}`}
                              className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-300 focus:outline-none"
                            />
                            {isCorrect && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">The option highlighted in green is the correct answer.</p>
                  </div>
                </>
              )}

              {/* ---- CODING FIELDS ---- */}
              {questionForm.type === 'coding' && (
                <div className="space-y-4">
                  {/* Boilerplate */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">Starter Code (Boilerplate) <span className="text-red-400">*</span></label>
                    <textarea
                      required
                      rows={5}
                      value={questionForm.boilerplate}
                      onChange={(e) => setQuestionForm({ ...questionForm, boilerplate: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all bg-slate-50"
                    />
                  </div>

                  {/* Input / Output Format */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1.5">Input Format</label>
                      <input
                        type="text"
                        value={questionForm.inputFormat}
                        onChange={(e) => setQuestionForm({ ...questionForm, inputFormat: e.target.value })}
                        placeholder="e.g. Two integers a, b"
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1.5">Output Format</label>
                      <input
                        type="text"
                        value={questionForm.outputFormat}
                        onChange={(e) => setQuestionForm({ ...questionForm, outputFormat: e.target.value })}
                        placeholder="e.g. Sum of a and b"
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                      />
                    </div>
                  </div>

                  {/* Constraints */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">Constraints</label>
                    <input
                      type="text"
                      value={questionForm.constraints}
                      onChange={(e) => setQuestionForm({ ...questionForm, constraints: e.target.value })}
                      placeholder="e.g. 1 â‰¤ a, b â‰¤ 10^5"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                    />
                  </div>

                  {/* Sample Input/Output */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1.5">Sample Input</label>
                      <input
                        type="text"
                        value={questionForm.sampleInput}
                        onChange={(e) => setQuestionForm({ ...questionForm, sampleInput: e.target.value })}
                        placeholder="e.g. 2 5"
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1.5">Sample Output</label>
                      <input
                        type="text"
                        value={questionForm.sampleOutput}
                        onChange={(e) => setQuestionForm({ ...questionForm, sampleOutput: e.target.value })}
                        placeholder="e.g. 7"
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                      />
                    </div>
                  </div>

                  {/* Test Cases */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-600">Test Cases <span className="text-red-400">*</span></label>
                      <button
                        type="button"
                        onClick={() => setQuestionForm(prev => ({
                          ...prev,
                          testCasesList: [...prev.testCasesList, { input: '', expected: '' }]
                        }))}
                        className="text-xs font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-violet-50 transition-colors"
                      >
                        + Add Case
                      </button>
                    </div>
                    <div className="space-y-2">
                      {questionForm.testCasesList.map((tc, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                          <span className="text-[10px] font-black text-slate-400 w-5 text-center">#{idx + 1}</span>
                          <input
                            type="text"
                            required
                            placeholder="Input"
                            value={tc.input}
                            onChange={(e) => {
                              const list = [...questionForm.testCasesList];
                              list[idx] = { ...list[idx], input: e.target.value };
                              setQuestionForm({ ...questionForm, testCasesList: list });
                            }}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-700 focus:outline-none focus:border-violet-400"
                          />
                          <span className="text-slate-300 text-xs">â†’</span>
                          <input
                            type="text"
                            required
                            placeholder="Expected output"
                            value={tc.expected}
                            onChange={(e) => {
                              const list = [...questionForm.testCasesList];
                              list[idx] = { ...list[idx], expected: e.target.value };
                              setQuestionForm({ ...questionForm, testCasesList: list });
                            }}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-700 focus:outline-none focus:border-violet-400"
                          />
                          {questionForm.testCasesList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setQuestionForm(prev => ({
                                ...prev,
                                testCasesList: prev.testCasesList.filter((_, i) => i !== idx)
                              }))}
                              className="text-red-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Explanation */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Explanation <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea
                  rows={2}
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  placeholder="Briefly explain the answer or approach..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingQuestion}
                  className={`flex-1 py-2.5 text-white font-bold rounded-xl text-sm transition-colors shadow-sm disabled:opacity-40 ${
                    questionForm.type === 'coding'
                      ? 'bg-violet-600 hover:bg-violet-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {savingQuestion ? 'Saving...' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Attendance Session Modal */}
      {isAttendanceModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div onClick={() => setIsAttendanceModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative bg-[#0f172a] border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl text-white">
            <button onClick={() => setIsAttendanceModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-850 transition-all"><X size={16}/></button>
            <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Clock size={18} className="text-indigo-400" /> Active Attendance PIN</h4>
            <form onSubmit={handleCreateAttendance} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Session Topic *</label>
                <input
                  type="text" required value={attendanceForm.topic}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, topic: e.target.value })}
                  placeholder="e.g. SQL Subqueries and Joins Lecture"
                  className="w-full bg-[#0a0a0a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Section Batch</label>
                  <select
                    value={attendanceForm.batch_name}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, batch_name: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-200"
                    title="Select Section"
                  >
                    <option value="">All Sections/Batches</option>
                    {courseBatches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Verification Code *</label>
                  <input
                    type="text" required value={attendanceForm.pin_code}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, pin_code: e.target.value })}
                    placeholder="e.g. 5291"
                    maxLength={6}
                    className="w-full bg-[#0a0a0a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 text-center font-mono font-bold tracking-widest text-indigo-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Session Date *</label>
                  <input
                    type="date" required value={attendanceForm.session_date}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, session_date: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Session Time</label>
                  <input
                    type="text" value={attendanceForm.session_time}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, session_time: e.target.value })}
                    placeholder="e.g. 10:00 AM"
                    className="w-full bg-[#0a0a0a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>
              <button
                type="submit" disabled={savingAttendance}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded text-xs uppercase tracking-wider transition-colors shadow-md mt-2"
              >
                {savingAttendance ? 'Creating PIN...' : 'Publish Session PIN Code'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
