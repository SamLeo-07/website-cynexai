import React, { useState, useEffect } from 'react';
import { 
  Course, CourseCurriculum, updateCourse, getBatches, getUsers, User, Batch, 
  createBatch, deleteBatch, updateUser, getMockTests, MockTest, createMockTest, 
  deleteMockTest, getQuestions, addQuestion, getTestResults, getDailyRecordings, 
  createDailyRecording, deleteDailyRecording, getAttendanceSessions, 
  createAttendanceSession, deleteAttendanceSession, getAttendanceRecordsBySession,
  AttendanceSession, DailyRecording, Question, TestResult,
  // Lessons and Engagement Operations
  Lesson, LessonResource, LessonAttendanceSession, createLesson, updateLesson, deleteLesson,
  getLessonsByCourse, getLessonResources, addLessonResource, deleteLessonResource,
  startLiveAttendanceSession, closeAttendanceSession, getActiveAttendanceSession,
  getAttendanceCheckIns
} from '../lib/turso';
import { 
  BookOpen, Plus, Save, X, Users, BookMarked, Trash2, Video, 
  ClipboardList, HelpCircle, CheckCircle2, AlertCircle, Clock, 
  KeyRound, Calendar, Edit2, PlayCircle, PlusCircle, ArrowRight, Download,
  ChevronDown, ChevronUp, Link2, Activity, Sparkles, Lock, RefreshCw, Play, Square, Check, ArrowUp, ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminCourseManagerProps {
  courses: Course[];
  onRefresh?: () => void;
}

export const AdminCourseManager: React.FC<AdminCourseManagerProps> = ({ courses, onRefresh }) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [subTab, setSubTab] = useState<'curriculum' | 'sections' | 'recordings' | 'mocktests' | 'attendance'>('curriculum');
  const [curriculumType, setCurriculumType] = useState<'blueprint' | 'schedule'>('blueprint');

  // Lessons, Resources, Attendance PIN and AI Generator State
  const [lessonsList, setLessonsList] = useState<Lesson[]>([]);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonFormData, setLessonFormData] = useState<{
    id?: string;
    course_id: string;
    module_name: string;
    lesson_title: string;
    video_url: string;
    order_index: number;
    module_id?: string;
    description?: string;
    duration?: number;
    prerequisite_lesson_id?: string;
    is_published?: number;
  }>({
    course_id: '',
    module_name: '',
    lesson_title: '',
    video_url: '',
    order_index: 0,
    module_id: '',
    description: '',
    duration: 15,
    prerequisite_lesson_id: '',
    is_published: 1
  });
  
  const [lessonResourcesList, setLessonResourcesList] = useState<LessonResource[]>([]);
  const [newResourceForm, setNewResourceForm] = useState({
    title: '',
    resource_type: 'slides' as any,
    resource_url: ''
  });

  const [activeSession, setActiveSession] = useState<LessonAttendanceSession | null>(null);
  const [activeCheckIns, setActiveCheckIns] = useState<any[]>([]);
  const [isLiveSessionOpen, setIsLiveSessionOpen] = useState(false);
  const [liveSessionLessonId, setLiveSessionLessonId] = useState<string | null>(null);

  const [isAiGeneratorOpen, setIsAiGeneratorOpen] = useState(false);
  const [aiCourseTitle, setAiCourseTitle] = useState('');
  const [aiSkillLevel, setAiSkillLevel] = useState('Beginner');
  const [aiTargetAudience, setAiTargetAudience] = useState('Students');
  const [aiDuration, setAiDuration] = useState('6 weeks');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

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

  // Export to CSV utility
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

  // Load operational databases
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

  // Fetch Lessons list for selected course
  const fetchLessons = async () => {
    if (!selectedCourseId) {
      setLessonsList([]);
      return;
    }
    try {
      const les = await getLessonsByCourse(selectedCourseId);
      setLessonsList(les);
      
      // Auto pre-populate active attendance session
      for (const l of les) {
        const sess = await getActiveAttendanceSession(l.id);
        if (sess && sess.is_active === 1) {
          setActiveSession(sess);
          setLiveSessionLessonId(l.id);
        }
      }
    } catch (e) {
      console.error("Failed to load lessons", e);
    }
  };

  useEffect(() => {
    loadData();
    fetchLessons();
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
      if (onRefresh) onRefresh();
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
      if (onRefresh) onRefresh();
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
      if (onRefresh) onRefresh();
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
      if (onRefresh) onRefresh();
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
      if (onRefresh) onRefresh();
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
      if (onRefresh) onRefresh();
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
      if (onRefresh) onRefresh();
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
      if (onRefresh) onRefresh();
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
      if (onRefresh) onRefresh();
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
        options: questionForm.type === 'mcq' ? questionForm.options.filter(o => o.trim()) : undefined,
        correctAnswer: questionForm.type === 'mcq' ? questionForm.correctAnswer : undefined,
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
      if (onRefresh) onRefresh();
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
      if (onRefresh) onRefresh();
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
      if (onRefresh) onRefresh();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      console.error(e);
      setError('Failed to delete attendance session.');
    }
  };

  // --- ADVANCED LESSONS & BLUEPRINT BUILDER HANDLERS ---
  const handleOpenLessonModal = async (courseId: string, moduleName: string, lesson?: Lesson) => {
    if (lesson) {
      setEditingLesson(lesson);
      setLessonFormData({
        id: lesson.id,
        course_id: lesson.course_id,
        module_name: lesson.module_name,
        lesson_title: lesson.lesson_title,
        video_url: lesson.video_url || '',
        order_index: lesson.order_index,
        module_id: lesson.module_id || '',
        description: lesson.description || '',
        duration: lesson.duration || 15,
        prerequisite_lesson_id: lesson.prerequisite_lesson_id || '',
        is_published: lesson.is_published !== undefined ? lesson.is_published : 1
      });
      try {
        const res = await getLessonResources(lesson.id);
        setLessonResourcesList(res);
      } catch (e) {
        console.error(e);
      }
    } else {
      setEditingLesson(null);
      setLessonFormData({
        course_id: courseId,
        module_name: moduleName,
        lesson_title: '',
        video_url: '',
        order_index: (lessonsList.filter(l => l.module_name === moduleName).length || 0) + 1,
        module_id: '',
        description: '',
        duration: 15,
        prerequisite_lesson_id: '',
        is_published: 1
      });
      setLessonResourcesList([]);
    }
    setNewResourceForm({ title: '', resource_type: 'slides', resource_url: '' });
    setIsLessonModalOpen(true);
  };

  const handleLessonFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonFormData.lesson_title.trim()) return;

    const lessonId = lessonFormData.id || `les_${Date.now()}`;
    const payload: Lesson = {
      id: lessonId,
      course_id: lessonFormData.course_id,
      module_name: lessonFormData.module_name,
      lesson_title: lessonFormData.lesson_title.trim(),
      video_url: lessonFormData.video_url.trim(),
      order_index: Number(lessonFormData.order_index),
      module_id: lessonFormData.module_id || undefined,
      description: lessonFormData.description || undefined,
      duration: Number(lessonFormData.duration || 15),
      prerequisite_lesson_id: lessonFormData.prerequisite_lesson_id || undefined,
      is_published: lessonFormData.is_published !== undefined ? lessonFormData.is_published : 1
    };

    try {
      if (editingLesson) {
        await updateLesson(payload);
        setSuccess('Lesson updated successfully');
      } else {
        await createLesson(payload);
        setSuccess('Lesson created successfully');
      }
      setIsLessonModalOpen(false);
      await fetchLessons();
      if (onRefresh) onRefresh();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to save lesson');
    }
  };

  const handleDeleteLesson = async (courseId: string, lessonId: string) => {
    if (!window.confirm('Are you sure you want to delete this lesson?')) return;
    try {
      await deleteLesson(lessonId);
      setSuccess('Lesson deleted');
      await fetchLessons();
      if (onRefresh) onRefresh();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete lesson');
    }
  };

  const handleMoveLesson = async (courseId: string, lessonId: string, direction: 'up' | 'down') => {
    const lessons = [...lessonsList];
    const index = lessons.findIndex(l => l.id === lessonId);
    if (index === -1) return;
    
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= lessons.length) return;

    const temp = lessons[index].order_index;
    lessons[index].order_index = lessons[swapIndex].order_index;
    lessons[swapIndex].order_index = temp;

    try {
      await updateLesson(lessons[index]);
      await updateLesson(lessons[swapIndex]);
      await fetchLessons();
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error("Failed to reorder lessons", e);
    }
  };

  // --- Resource Vault Handlers ---
  const handleResourceAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson || !newResourceForm.title.trim() || !newResourceForm.resource_url.trim()) return;

    const newRes: LessonResource = {
      id: `res_${Date.now()}`,
      lesson_id: editingLesson.id,
      resource_type: newResourceForm.resource_type,
      title: newResourceForm.title.trim(),
      resource_url: newResourceForm.resource_url.trim(),
      created_at: new Date().toISOString()
    };

    try {
      await addLessonResource(newRes);
      setLessonResourcesList(prev => [...prev, newRes]);
      setNewResourceForm({ title: '', resource_type: 'slides', resource_url: '' });
      setSuccess('Resource added successfully');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to add resource');
    }
  };

  const handleResourceDelete = async (resId: string) => {
    try {
      await deleteLessonResource(resId);
      setLessonResourcesList(prev => prev.filter(r => r.id !== resId));
      setSuccess('Resource deleted');
      setTimeout(() => setSuccess(null), 2000);
    } catch {
      setError('Failed to delete resource');
    }
  };

  // --- Live Attendance Passcode Handlers ---
  const handleToggleLiveAttendance = async (lessonId: string) => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    try {
      const sessId = await startLiveAttendanceSession(lessonId, pin);
      const sess: LessonAttendanceSession = {
        id: sessId,
        lesson_id: lessonId,
        attendance_pin: pin,
        is_active: 1,
        started_at: new Date().toISOString()
      };
      setActiveSession(sess);
      setLiveSessionLessonId(lessonId);
      setActiveCheckIns([]);
      setIsLiveSessionOpen(true);
      setSuccess(`Live Attendance session started! PIN: ${pin}`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (e) {
      setError('Failed to start live session');
    }
  };

  const handleCloseLiveSession = async (sessionId: string) => {
    try {
      await closeAttendanceSession(sessionId);
      setActiveSession(null);
      setLiveSessionLessonId(null);
      setIsLiveSessionOpen(false);
      setSuccess('Live session closed successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to close session');
    }
  };

  const refreshAttendanceCheckInsList = async () => {
    if (activeSession) {
      try {
        const records = await getAttendanceCheckIns(activeSession.id);
        setActiveCheckIns(records);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // --- CynexAI Curriculum Generator Handlers ---
  const handleOpenAiGenerator = (course: Course) => {
    setAiCourseTitle(course.title);
    setAiPrompt(`Create a modular curriculum outline with lessons for a course on ${course.title}. Ensure it covers beginner setups, core syntax, intermediate challenges, and a final capstone project.`);
    setIsAiGeneratorOpen(true);
    setAiResult(null);
    setError(null);
  };

  const handleAiGenerateCurriculum = async () => {
    if (!aiPrompt.trim() || !aiCourseTitle.trim()) return;
    setAiGenerating(true);
    setError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      const responseOutline = {
        modules: [
          {
            name: `Module 1: Getting Started with ${aiCourseTitle}`,
            lessons: [
              { title: `Core Paradigms and Concepts`, duration: 15, description: `Understanding what is ${aiCourseTitle}, basic setup requirements, and tools.` },
              { title: `Environment Setup and Verification`, duration: 25, description: `Hands-on guide to installation, running a hello-world app, and verification.` }
            ]
          },
          {
            name: `Module 2: Essential Data Structures & Logic`,
            lessons: [
              { title: `Variables, Scope, and Collections`, duration: 20, description: `Variables, data types, scoping rules, arrays/lists, dictionaries/objects.` },
              { title: `Flow Controls and Functions`, duration: 30, description: `Conditional statements, iterative loops, functions declarations, and parameters.` }
            ]
          },
          {
            name: `Module 3: Advanced Applications and Project`,
            lessons: [
              { title: `Integrations and Dynamic Flow`, duration: 35, description: `Calling external APIs, async routines, error handling strategies.` },
              { title: `Capstone Project Build Session`, duration: 45, description: `Final lab challenge integrating all concepts to build a working platform tool.` }
            ]
          }
        ]
      };
      setAiResult(responseOutline);
    } catch {
      setError('AI generation failed.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleApplyAiCurriculum = async (courseId: string) => {
    if (!aiResult) return;
    const course = courses.find(c => c.id === courseId);
    if (!course) return;
    try {
      let order = 1;
      
      const safeParseArr = (v?: string): string[] => {
        if (!v) return [];
        try { return JSON.parse(v); } catch { return []; }
      };
      const currentModulesList = [...safeParseArr(course.modules)];

      for (const mod of aiResult.modules) {
        if (!currentModulesList.includes(mod.name)) {
          currentModulesList.push(mod.name);
        }
        for (const les of mod.lessons) {
          const lessonId = `les_ai_${Date.now()}_${order}_${Math.random().toString(36).substr(2, 4)}`;
          await createLesson({
            id: lessonId,
            course_id: courseId,
            module_name: mod.name,
            lesson_title: les.title,
            video_url: '',
            order_index: order++,
            description: les.description,
            duration: les.duration,
            is_published: 1
          });
        }
      }

      const updatedCourse = {
        ...course,
        modules: JSON.stringify(currentModulesList)
      };
      await updateCourse(updatedCourse);
      
      setSuccess('AI Curriculum drafted and applied successfully! Draft lessons added.');
      setIsAiGeneratorOpen(false);
      setAiResult(null);
      if (onRefresh) onRefresh();
      await fetchLessons();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError('Failed to apply AI curriculum');
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
                <button type="button"
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
              <div className="space-y-6">
                {/* Visual outliner vs Flat daily calendar schedule selector */}
                <div className="flex border-b border-slate-800 pb-3 gap-6">
                  <button type="button"
                    onClick={() => setCurriculumType('blueprint')}
                    className={`text-xs font-bold uppercase tracking-wider pb-2 border-b-2 transition-all ${
                      curriculumType === 'blueprint'
                        ? 'border-[#41c8df] text-[#41c8df]'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    1. Modules & Lessons Blueprint
                  </button>
                  <button type="button"
                    onClick={() => setCurriculumType('schedule')}
                    className={`text-xs font-bold uppercase tracking-wider pb-2 border-b-2 transition-all ${
                      curriculumType === 'schedule'
                        ? 'border-[#41c8df] text-[#41c8df]'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    2. Day-by-Day Calendar Schedule
                  </button>
                </div>

                {curriculumType === 'blueprint' ? (
                  /* Visual Modules & Lessons Accordion Builder */
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-md font-bold text-slate-100 flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-[#41c8df]" /> Modular Course Blueprint Builder
                        </h4>
                        <button type="button"
                          onClick={() => {
                            const c = courses.find(course => course.id === selectedCourseId);
                            if (c) handleOpenAiGenerator(c);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/25 rounded-lg text-xs font-bold transition-all"
                        >
                          <Sparkles size={12} />
                          CynexAI Curriculum Generator
                        </button>
                      </div>

                      {(() => {
                        const course = courses.find(c => c.id === selectedCourseId);
                        if (!course) return null;
                        
                        let parsedModules: string[] = [];
                        try {
                          parsedModules = JSON.parse(course.modules || '[]');
                        } catch {
                          parsedModules = [];
                        }

                        if (parsedModules.length === 0) {
                          return (
                            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl space-y-3">
                              <p className="text-sm text-gray-500 font-medium">No modules added yet for this course curriculum.</p>
                              <p className="text-xs text-gray-650">Use the AI Generator above or append your first module outline below.</p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-4">
                            {parsedModules.map((moduleName, modIndex) => {
                              const moduleLessons = lessonsList
                                .filter(l => l.module_name === moduleName)
                                .sort((a, b) => a.order_index - b.order_index);

                              return (
                                <div key={moduleName} className="border border-slate-800 rounded-xl bg-secondary/5 overflow-hidden">
                                  {/* Module Header */}
                                  <div className="p-4 bg-slate-900/40 flex items-center justify-between border-b border-slate-800/60">
                                    <div className="flex items-center gap-2.5">
                                      <span className="w-6 h-6 bg-[#41c8df]/15 text-[#41c8df] border border-[#41c8df]/30 rounded flex items-center justify-center text-xs font-bold">
                                        {modIndex + 1}
                                      </span>
                                      <span className="text-sm font-bold text-gray-200">{moduleName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button type="button"
                                        onClick={() => handleOpenLessonModal(course.id, moduleName)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all"
                                      >
                                        <Plus size={14} /> Add Lesson
                                      </button>
                                      <button type="button"
                                        onClick={async () => {
                                          if (window.confirm(`Delete module "${moduleName}"? This will not delete lessons, but they will become unassigned.`)) {
                                            const newModules = parsedModules.filter((_, idx) => idx !== modIndex);
                                            await updateCourse({ ...course, modules: JSON.stringify(newModules) });
                                            if (onRefresh) onRefresh();
                                          }
                                        }}
                                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
                                        title="Remove Module"
                                      >
                                        <X size={15} />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Lessons List */}
                                  <div className="divide-y divide-slate-800/50">
                                    {moduleLessons.length === 0 ? (
                                      <div className="p-4 text-center text-xs text-gray-500 italic">
                                        No lessons in this module. Click "Add Lesson" to add one.
                                      </div>
                                    ) : (
                                      moduleLessons.map((lesson, index) => {
                                        const hasPrereq = lesson.prerequisite_lesson_id;
                                        const prereqTitle = hasPrereq 
                                          ? lessonsList.find(l => l.id === lesson.prerequisite_lesson_id)?.lesson_title 
                                          : '';
                                        const isSessionActive = activeSession && activeSession.lesson_id === lesson.id && activeSession.is_active === 1;

                                        return (
                                          <div key={lesson.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/10 transition-colors">
                                            <div className="flex items-start gap-3">
                                              {/* Sort Controls */}
                                              <div className="flex flex-col gap-0.5 mt-0.5">
                                                <button type="button"
                                                  onClick={() => handleMoveLesson(course.id, lesson.id, 'up')}
                                                  disabled={index === 0}
                                                  className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30"
                                                >
                                                  <ArrowUp size={14} />
                                                </button>
                                                <button type="button"
                                                  onClick={() => handleMoveLesson(course.id, lesson.id, 'down')}
                                                  disabled={index === moduleLessons.length - 1}
                                                  className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30"
                                                >
                                                  <ArrowDown size={14} />
                                                </button>
                                              </div>
                                              <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <span className="text-sm font-bold text-slate-300">{lesson.lesson_title}</span>
                                                  <span className="text-[10px] text-gray-500 font-semibold bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/50 flex items-center gap-1">
                                                    <Clock size={10} /> {lesson.duration || 15} mins
                                                  </span>
                                                  {lesson.is_published === 0 ? (
                                                    <span className="text-[9px] font-bold bg-amber-500/10 text-amber-500 px-1 py-0.2 rounded border border-amber-500/20">DRAFT</span>
                                                  ) : (
                                                    <span className="text-[9px] font-bold bg-cyan-500/10 text-cyan-400 px-1 py-0.2 rounded border border-cyan-500/20">ACTIVE</span>
                                                  )}
                                                  {hasPrereq && (
                                                    <span className="text-[9px] font-bold bg-purple-500/10 text-purple-400 px-1.5 py-0.2 rounded border border-purple-500/20 flex items-center gap-1">
                                                      <Lock size={9} /> Prereq: {prereqTitle || 'Locked'}
                                                    </span>
                                                  )}
                                                </div>
                                                {lesson.description && (
                                                  <p className="text-xs text-gray-400 mt-1 line-clamp-1">{lesson.description}</p>
                                                )}
                                              </div>
                                            </div>

                                            {/* Lesson Actions */}
                                            <div className="flex items-center gap-2 self-end sm:self-center">
                                              {isSessionActive ? (
                                                <button type="button"
                                                  onClick={() => {
                                                    setLiveSessionLessonId(lesson.id);
                                                    setIsLiveSessionOpen(true);
                                                    refreshAttendanceCheckInsList();
                                                  }}
                                                  className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/15 border border-green-500/30 text-green-400 rounded-md text-xs font-bold hover:bg-green-500/20 transition-all animate-pulse"
                                                >
                                                  <Activity size={12} />
                                                  PIN: {activeSession.attendance_pin}
                                                </button>
                                              ) : (
                                                <button type="button"
                                                  onClick={() => handleToggleLiveAttendance(lesson.id)}
                                                  className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-md text-xs font-bold hover:border-slate-500 transition-all"
                                                >
                                                  <Clock size={12} />
                                                  Live PIN
                                                </button>
                                              )}

                                              <button type="button"
                                                onClick={() => handleOpenLessonModal(course.id, moduleName, lesson)}
                                                className="p-1.5 text-gray-400 hover:text-[#41c8df] hover:bg-[#41c8df]/10 rounded-md border border-transparent hover:border-[#41c8df]/25"
                                                title="Manage Resource Vault"
                                              >
                                                <Link2 size={16} />
                                              </button>
                                              <button type="button"
                                                onClick={() => handleOpenLessonModal(course.id, moduleName, lesson)}
                                                className="p-1.5 text-gray-400 hover:text-white hover:bg-slate-700/50 rounded-md transition-all"
                                                title="Edit Lesson"
                                              >
                                                <Edit2 size={16} />
                                              </button>
                                              <button type="button"
                                                onClick={() => handleDeleteLesson(course.id, lesson.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                                                title="Delete Lesson"
                                              >
                                                <Trash2 size={16} />
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {/* Create Module Form */}
                      {(() => {
                        const course = courses.find(c => c.id === selectedCourseId);
                        if (!course) return null;
                        
                        let parsedModules: string[] = [];
                        try {
                          parsedModules = JSON.parse(course.modules || '[]');
                        } catch {
                          parsedModules = [];
                        }

                        return (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              const form = e.currentTarget;
                              const input = form.elements.namedItem('moduleName') as HTMLInputElement;
                              const newModuleName = input.value.trim();
                              if (!newModuleName) return;
                              if (parsedModules.includes(newModuleName)) {
                                alert('Module name already exists');
                                return;
                              }
                              const updatedModules = [...parsedModules, newModuleName];
                              try {
                                await updateCourse({ ...course, modules: JSON.stringify(updatedModules) });
                                input.value = '';
                                if (onRefresh) onRefresh();
                              } catch (e) {
                                alert('Failed to add module');
                              }
                            }}
                            className="flex gap-2 bg-[#0a0a0a] p-3 rounded-lg border border-slate-800"
                          >
                            <input
                              type="text"
                              name="moduleName"
                              placeholder="Enter new module name (e.g. Module 3: Advanced Concepts)"
                              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm text-slate-200 outline-none focus:border-[#41c8df]"
                              required
                            />
                            <button
                              type="submit"
                              className="px-4 py-2 bg-[#41c8df] text-black hover:bg-[#41c8df]/90 rounded-md text-sm font-bold uppercase transition-colors"
                            >
                              Add Module
                            </button>
                          </form>
                        );
                      })()}
                    </div>

                    {/* Sidebar section */}
                    <div className="lg:col-span-1 space-y-6">
                      <div className="bg-[#0a0a0a] border border-slate-800 rounded-xl p-5 space-y-4">
                        <h5 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                          <Users size={14} /> Batches assigned to Course
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
                ) : (
                  /* Day-by-Day Calendar Schedule tab */
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-indigo-400" /> Advanced Curriculum Builder
                        </h4>
                        <div className="flex gap-2">
                          <button type="button"
                            onClick={handleDownloadCurriculum}
                            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-md text-sm flex items-center gap-2 transition-colors shadow-sm"
                          >
                            <Download className="w-4 h-4" /> Download Curriculum
                          </button>
                          <button type="button"
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
                        className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 rounded-md text-sm text-slate-200 outline-none focus:border-indigo-500 placeholder:text-slate-650"
                      />
                      <button type="button"
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
                                <button type="button" onClick={() => handleDeleteBatch(batch.id)} className="p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded transition-colors" title="Delete Section">
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
                                      <button type="button" onClick={() => handleRemoveStudent(student)} className="p-1 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded shrink-0" title="Remove from batch">
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
                  <button type="button" 
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
                          <button type="button" onClick={() => handleDeleteRecording(rec.id)} className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded transition-colors" title="Delete Recording">
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
                    <button type="button" onClick={() => setIsTestModalOpen(true)} className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors" title="Create Test">
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
                            <span className="text-[10px] text-slate-400">{t.duration}m · {t.category}</span>
                          </div>
                          <button type="button" 
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
                            <button type="button" onClick={() => setIsQuestionModalOpen(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs uppercase tracking-wider shadow-md">
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
                  <button type="button" 
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
                            <button type="button" onClick={() => handleDeleteAttendance(sess.id)} className="p-1 text-slate-500 hover:text-red-400 rounded" title="Delete PIN">
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
            <button type="button" onClick={() => setIsRecModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-850 transition-all"><X size={16}/></button>
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
            <button type="button" onClick={() => setIsTestModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-850 transition-all"><X size={16}/></button>
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
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-0"
                />
                <label htmlFor="test-active" className="text-xs text-slate-350 cursor-pointer select-none">Active / Show to students</label>
              </div>
              <button
                type="submit" disabled={savingTest}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded text-xs uppercase tracking-wider transition-colors shadow-md mt-2"
              >
                {savingTest ? 'Saving Mock Test...' : 'Save & Publish Mock Test'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Question Modal */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div onClick={() => setIsQuestionModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative bg-[#0f172a] border border-slate-800 rounded-xl p-6 w-full max-w-2xl shadow-2xl text-white max-h-[90vh] overflow-y-auto">
            <button type="button" onClick={() => setIsQuestionModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-850 transition-all"><X size={16}/></button>
            <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><HelpCircle size={18} className="text-indigo-400" /> Add Question to Mock Test</h4>
            <form onSubmit={handleAddQuestion} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Difficulty</label>
                  <select
                    value={questionForm.difficulty}
                    onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value as any })}
                    className="w-full bg-[#0a0a0a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-200"
                    title="Select Difficulty"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Question Type</label>
                  <select
                    value={questionForm.type}
                    onChange={(e) => setQuestionForm({ ...questionForm, type: e.target.value as any })}
                    className="w-full bg-[#0a0a0a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-200"
                    title="Select Question Type"
                  >
                    <option value="mcq">Multiple Choice Question (MCQ)</option>
                    <option value="coding">Practical Coding Problem</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Question Statement / Text *</label>
                <textarea
                  rows={3} required value={questionForm.text}
                  onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                  placeholder="e.g. What is the complexity of binary search?"
                  className="w-full bg-[#0a0a0a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 resize-none"
                />
              </div>

              {questionForm.type === 'mcq' ? (
                /* MCQ specific options */
                <div className="space-y-3 pt-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Answer Options & Correct Option</label>
                  {questionForm.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex gap-2 items-center">
                      <input
                        type="radio" name="correctAnswer" checked={questionForm.correctAnswer === oIdx}
                        onChange={() => setQuestionForm({ ...questionForm, correctAnswer: oIdx })}
                        className="w-4 h-4 text-indigo-500 bg-slate-900 border-slate-700"
                        title={`Option ${String.fromCharCode(65 + oIdx)} is correct`}
                      />
                      <input
                        type="text" required placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...questionForm.options];
                          newOpts[oIdx] = e.target.value;
                          setQuestionForm({ ...questionForm, options: newOpts });
                        }}
                        className="flex-1 bg-[#0a0a0a] border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                /* Coding specific options */
                <div className="space-y-4 pt-2 border-t border-slate-800">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Coding Challenge Settings</label>
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold block mb-1">Starter Boilerplate Code</label>
                    <textarea
                      rows={4} value={questionForm.boilerplate}
                      onChange={(e) => setQuestionForm({ ...questionForm, boilerplate: e.target.value })}
                      className="w-full bg-[#050505] border border-slate-800 rounded p-2.5 font-mono text-[10px] text-indigo-300"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-1">Input Format Description</label>
                      <input
                        type="text" value={questionForm.inputFormat}
                        onChange={(e) => setQuestionForm({ ...questionForm, inputFormat: e.target.value })}
                        placeholder="e.g. An integer array arr"
                        className="w-full bg-[#0a0a0a] border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-1">Output Format Description</label>
                      <input
                        type="text" value={questionForm.outputFormat}
                        onChange={(e) => setQuestionForm({ ...questionForm, outputFormat: e.target.value })}
                        placeholder="e.g. Return the maximum sum"
                        className="w-full bg-[#0a0a0a] border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-1">Constraints</label>
                      <input
                        type="text" value={questionForm.constraints}
                        onChange={(e) => setQuestionForm({ ...questionForm, constraints: e.target.value })}
                        placeholder="1 <= N <= 10^5"
                        className="w-full bg-[#0a0a0a] border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-1">Sample Input</label>
                      <input
                        type="text" value={questionForm.sampleInput}
                        onChange={(e) => setQuestionForm({ ...questionForm, sampleInput: e.target.value })}
                        placeholder="e.g. [1, 2, 3]"
                        className="w-full bg-[#0a0a0a] border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-1">Sample Output</label>
                      <input
                        type="text" value={questionForm.sampleOutput}
                        onChange={(e) => setQuestionForm({ ...questionForm, sampleOutput: e.target.value })}
                        placeholder="e.g. 6"
                        className="w-full bg-[#0a0a0a] border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] text-slate-500 font-bold block">Evaluation Test Cases *</label>
                      <button type="button" onClick={() => setQuestionForm({ ...questionForm, testCasesList: [...questionForm.testCasesList, { input: '', expected: '' }] })} className="text-[9px] text-indigo-400 font-bold uppercase hover:text-indigo-300">
                        + Add Case
                      </button>
                    </div>
                    {questionForm.testCasesList.map((tc, tcIdx) => (
                      <div key={tcIdx} className="flex gap-2 items-center group">
                        <input
                          type="text" required placeholder="Arg input (e.g. [1,2],3)"
                          value={tc.input}
                          onChange={(e) => {
                            const newList = [...questionForm.testCasesList];
                            newList[tcIdx].input = e.target.value;
                            setQuestionForm({ ...questionForm, testCasesList: newList });
                          }}
                          className="flex-1 bg-[#0a0a0a] border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200"
                        />
                        <input
                          type="text" required placeholder="Expected output (e.g. 6)"
                          value={tc.expected}
                          onChange={(e) => {
                            const newList = [...questionForm.testCasesList];
                            newList[tcIdx].expected = e.target.value;
                            setQuestionForm({ ...questionForm, testCasesList: newList });
                          }}
                          className="flex-1 bg-[#0a0a0a] border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200"
                        />
                        <button type="button" onClick={() => setQuestionForm({ ...questionForm, testCasesList: questionForm.testCasesList.filter((_, i) => i !== tcIdx) })} className="p-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Answer Explanation</label>
                <textarea
                  rows={2} value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  placeholder="Explain why this answer is correct..."
                  className="w-full bg-[#0a0a0a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 resize-none"
                />
              </div>

              <button
                type="submit" disabled={savingQuestion}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded text-xs uppercase tracking-wider transition-colors shadow-md mt-2"
              >
                {savingQuestion ? 'Adding Question...' : 'Add Question'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Attendance Session PIN Modal */}
      {isAttendanceModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div onClick={() => setIsAttendanceModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative bg-[#0f172a] border border-slate-800 rounded-xl p-6 w-full max-w-lg shadow-2xl text-white">
            <button type="button" onClick={() => setIsAttendanceModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-850 transition-all"><X size={16}/></button>
            <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><KeyRound size={18} className="text-indigo-400" /> Start Live Passcode Session</h4>
            <form onSubmit={handleCreateAttendance} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Session Topic / Subject *</label>
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

      {/* Lesson Editor & Resource Vault Manager Modal */}
      <AnimatePresence>
        {isLessonModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsLessonModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-[#0f172a] border border-slate-800 rounded-xl p-8 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto text-white">
              <button type="button" onClick={() => setIsLessonModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all" title="Close Modal">
                <X size={20} />
              </button>

              <h2 className="text-2xl font-bold text-slate-200 mb-2 flex items-center gap-3">
                <BookOpen className="text-[#41c8df]" />
                {editingLesson ? 'Edit Lesson & Resource Vault' : 'Create New Lesson'}
              </h2>
              <p className="text-sm text-gray-450 mb-8">
                {editingLesson ? 'Configure lesson video, description, prerequisites, and resource vault assets.' : 'Add a new lesson node to this module outline.'}
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Lesson Details Form */}
                <form onSubmit={handleLessonFormSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="lesson-title-input" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lesson Title *</label>
                    <input
                      id="lesson-title-input"
                      type="text"
                      required
                      value={lessonFormData.lesson_title}
                      onChange={(e) => setLessonFormData({ ...lessonFormData, lesson_title: e.target.value })}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-slate-200 text-sm font-medium"
                      placeholder="e.g., Intro to Neural Networks"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="lesson-duration-input" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Duration (Minutes)</label>
                      <input
                        id="lesson-duration-input"
                        type="number"
                        min="1"
                        required
                        value={lessonFormData.duration || 15}
                        onChange={(e) => setLessonFormData({ ...lessonFormData, duration: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-slate-200 text-sm font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="lesson-published-input" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</label>
                      <select
                        id="lesson-published-input"
                        value={lessonFormData.is_published}
                        onChange={(e) => setLessonFormData({ ...lessonFormData, is_published: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-slate-200 text-sm font-medium"
                      >
                        <option value="1">Published / Active</option>
                        <option value="0">Draft / Hidden</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="lesson-video-url-input" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Video URL (YouTube or MP4)</label>
                    <input
                      id="lesson-video-url-input"
                      type="text"
                      value={lessonFormData.video_url}
                      onChange={(e) => setLessonFormData({ ...lessonFormData, video_url: e.target.value })}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-slate-200 text-sm font-medium"
                      placeholder="e.g., https://www.youtube.com/watch?v=..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="lesson-prereq-input" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prerequisite Lesson Link</label>
                    <select
                      id="lesson-prereq-input"
                      value={lessonFormData.prerequisite_lesson_id || ''}
                      onChange={(e) => setLessonFormData({ ...lessonFormData, prerequisite_lesson_id: e.target.value || undefined })}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-slate-205 text-sm font-medium cursor-pointer"
                    >
                      <option value="">None (Always Unlocked)</option>
                      {lessonsList
                        .filter(l => l.id !== lessonFormData.id)
                        .map(l => (
                          <option key={l.id} value={l.id}>{l.lesson_title}</option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="lesson-desc-input" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lesson Description</label>
                    <textarea
                      id="lesson-desc-input"
                      rows={3}
                      value={lessonFormData.description || ''}
                      onChange={(e) => setLessonFormData({ ...lessonFormData, description: e.target.value })}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-slate-200 text-sm font-medium resize-none"
                      placeholder="Brief overview of concept covered in this lesson..."
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 border-t border-slate-850 pt-5">
                    <button
                      type="button"
                      onClick={() => setIsLessonModalOpen(false)}
                      className="px-5 py-2.5 text-gray-400 hover:text-white text-xs font-bold uppercase transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#41c8df] text-black font-bold text-xs uppercase rounded-lg hover:bg-[#41c8df]/90 transition-all"
                    >
                      {editingLesson ? 'Save Changes' : 'Create Lesson'}
                    </button>
                  </div>
                </form>

                {/* Resource Vault Manager */}
                <div className="border-l border-slate-800 pl-0 lg:pl-8 space-y-6">
                  <div>
                    <h3 className="text-xs font-black text-[#41c8df] uppercase tracking-widest flex items-center gap-1.5 mb-2">
                      <Link2 size={14} />
                      Resource Vault Assets
                    </h3>
                    <p className="text-xs text-gray-450">
                      Link course material, slides, GitHub repositories, and exercise download bundles directly to this lesson.
                    </p>
                  </div>

                  {!editingLesson ? (
                    <div className="text-center py-12 bg-[#0a0a0a] border border-slate-800 rounded-xl">
                      <Lock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-500 font-medium">Please create and save the lesson first to unlock the Resource Vault Manager.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Active Vault list */}
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                        {lessonResourcesList.length === 0 ? (
                          <p className="text-xs text-gray-500 italic">No resources attached to this lesson vault.</p>
                        ) : (
                          lessonResourcesList.map(res => (
                            <div key={res.id} className="flex items-center justify-between p-2.5 bg-[#0a0a0a] border border-slate-800 rounded-lg text-xs">
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 bg-slate-800 text-[#41c8df] border border-slate-700 rounded uppercase font-bold text-[9px]">
                                  {res.resource_type}
                                </span>
                                <span className="font-semibold text-gray-300 truncate max-w-[200px]" title={res.title}>{res.title}</span>
                              </div>
                              <button type="button"
                                onClick={() => handleResourceDelete(res.id)}
                                className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add resource form */}
                      <form onSubmit={handleResourceAdd} className="bg-slate-900 p-4 border border-slate-800 rounded-xl space-y-4">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block border-b border-slate-800 pb-2">Attach New Vault Asset</span>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label htmlFor="res-type" className="text-[10px] text-gray-505 font-bold block uppercase">Asset Type</label>
                            <select
                              id="res-type"
                              value={newResourceForm.resource_type}
                              onChange={(e) => setNewResourceForm({ ...newResourceForm, resource_type: e.target.value as any })}
                              className="w-full bg-[#0a0a0a] border border-slate-800 rounded-lg p-2 text-xs text-gray-300 outline-none"
                            >
                              <option value="slides">Slide Deck</option>
                              <option value="github">GitHub Repo</option>
                              <option value="pdf">PDF Study Guide</option>
                              <option value="zip">ZIP Exercise Bundle</option>
                              <option value="figma">Figma Design File</option>
                              <option value="notion">Notion Document</option>
                              <option value="sandbox">Coding Sandbox</option>
                              <option value="external_link">External Web Link</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label htmlFor="res-title" className="text-[10px] text-gray-505 font-bold block uppercase">Display Title</label>
                            <input
                              id="res-title"
                              type="text"
                              required
                              value={newResourceForm.title}
                              onChange={(e) => setNewResourceForm({ ...newResourceForm, title: e.target.value })}
                              placeholder="e.g. Lecture Slides PDF"
                              className="w-full bg-[#0a0a0a] border border-slate-800 rounded-lg p-2 text-xs text-gray-300 outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label htmlFor="res-url" className="text-[10px] text-gray-505 font-bold block uppercase">Resource URL</label>
                          <input
                            id="res-url"
                            type="url"
                            required
                            value={newResourceForm.resource_url}
                            onChange={(e) => setNewResourceForm({ ...newResourceForm, resource_url: e.target.value })}
                            placeholder="e.g. https://drive.google.com/..."
                            className="w-full bg-[#0a0a0a] border border-slate-800 rounded-lg p-2 text-xs text-gray-300 outline-none"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold uppercase transition-colors"
                        >
                          Attach Resource
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Live PIN Attendance Session Drawer */}
      <AnimatePresence>
        {isLiveSessionOpen && activeSession && (
          <div className="fixed inset-0 z-[200] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsLiveSessionOpen(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative bg-[#0b0f19] border-l border-slate-800 w-full max-w-md shadow-2xl h-full flex flex-col z-10 text-white">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-md font-bold uppercase tracking-widest text-[#41c8df] flex items-center gap-2">
                  <Activity className="text-green-500 animate-pulse" />
                  Live Attendance Check
                </h2>
                <button type="button" onClick={() => setIsLiveSessionOpen(false)} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                <div className="bg-slate-900 border border-slate-850 rounded-xl p-6 text-center space-y-4">
                  <span className="text-[10px] font-black tracking-widest text-green-500 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 uppercase">Session Active</span>
                  <div className="space-y-1">
                    <span className="text-xs text-gray-400 font-medium block">4-Digit Passcode PIN</span>
                    <div className="text-5xl font-mono tracking-[0.2em] font-black text-white pl-2">
                      {activeSession.attendance_pin}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Instruct students in this batch to open their course player and input this passcode widget to verify live attendance check-in.
                  </p>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <button type="button"
                      onClick={refreshAttendanceCheckInsList}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all"
                    >
                      <RefreshCw size={12} /> Refresh
                    </button>
                    <button type="button"
                      onClick={() => handleCloseLiveSession(activeSession.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold transition-all"
                    >
                      <Square size={12} /> End Session
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                    <span className="uppercase tracking-wider">Checked In Students</span>
                    <span className="bg-green-500/15 text-green-400 border border-green-500/20 px-2 py-0.5 rounded font-mono">
                      {activeCheckIns.length} Present
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {activeCheckIns.length === 0 ? (
                      <div className="text-center py-12 border border-slate-800 border-dashed rounded-xl">
                        <Users className="w-8 h-8 text-gray-600 mx-auto mb-2 animate-bounce" />
                        <p className="text-xs text-gray-500 font-medium">Waiting for check-ins...</p>
                      </div>
                    ) : (
                      activeCheckIns.map((item, idx) => (
                        <div key={item.id || idx} className="p-3 bg-secondary/5 border border-slate-800 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-gray-200 block">{item.name}</span>
                            <span className="text-[10px] text-gray-500 font-semibold">{item.email}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-gray-400 font-bold block">
                              {new Date(item.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-[9px] text-green-400 font-bold bg-green-500/10 px-1 py-0.2 rounded border border-green-500/20">VERIFIED</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CynexAI Curriculum Generator Panel */}
      <AnimatePresence>
        {isAiGeneratorOpen && (
          <div className="fixed inset-0 z-[200] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsAiGeneratorOpen(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative bg-[#0b0f19] border-l border-slate-800 w-full max-w-2xl shadow-2xl h-full flex flex-col z-10 text-white">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-purple-950/20">
                <h2 className="text-md font-bold uppercase tracking-widest text-purple-400 flex items-center gap-2">
                  <Sparkles size={16} />
                  CynexAI Curriculum Architect
                </h2>
                <button type="button" onClick={() => setIsAiGeneratorOpen(false)} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                {!aiResult ? (
                  <div className="space-y-6">
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Utilize CynexAI to automatically architect a standard day-by-day curriculum skeleton mapping lessons, modules, and study objectives.
                    </p>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="ai-title-cm" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Course Subject/Title</label>
                        <input
                          id="ai-title-cm"
                          type="text"
                          value={aiCourseTitle}
                          onChange={(e) => setAiCourseTitle(e.target.value)}
                          className="w-full px-4 py-3 bg-[#0a0a0a] border border-slate-800 focus:border-purple-500 rounded-xl outline-none text-slate-205 text-sm font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label htmlFor="ai-level-cm" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Skill Level</label>
                          <select
                            id="ai-level-cm"
                            value={aiSkillLevel}
                            onChange={(e) => setAiSkillLevel(e.target.value)}
                            className="w-full px-4 py-3 bg-[#0a0a0a] border border-slate-800 focus:border-purple-500 rounded-xl outline-none text-slate-205 text-sm font-medium"
                          >
                            <option value="Beginner">Beginner Level</option>
                            <option value="Intermediate">Intermediate Level</option>
                            <option value="Advanced">Advanced Level</option>
                            <option value="All Levels">All Levels (Comprehensive)</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="ai-duration-cm" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Target Duration</label>
                          <input
                            id="ai-duration-cm"
                            type="text"
                            value={aiDuration}
                            onChange={(e) => setAiDuration(e.target.value)}
                            className="w-full px-4 py-3 bg-[#0a0a0a] border border-slate-800 focus:border-purple-500 rounded-xl outline-none text-slate-205 text-sm font-medium"
                            placeholder="e.g. 6 weeks / 30 hours"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="ai-target-cm" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Target Audience Profile</label>
                        <input
                          id="ai-target-cm"
                          type="text"
                          value={aiTargetAudience}
                          onChange={(e) => setAiTargetAudience(e.target.value)}
                          className="w-full px-4 py-3 bg-[#0a0a0a] border border-slate-800 focus:border-purple-500 rounded-xl outline-none text-slate-205 text-sm font-medium"
                          placeholder="e.g. college students, professionals, absolute beginners"
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="ai-prompt-inst-cm" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Special AI Architecting Guidelines</label>
                        <textarea
                          id="ai-prompt-inst-cm"
                          rows={4}
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          className="w-full px-4 py-3 bg-[#0a0a0a] border border-slate-800 focus:border-purple-500 rounded-xl outline-none text-slate-205 text-sm font-medium resize-none"
                          placeholder="Add details about specific frameworks, coding languages, or case studies to focus on..."
                        />
                      </div>

                      <button type="button"
                        onClick={handleAiGenerateCurriculum}
                        disabled={aiGenerating}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs uppercase transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {aiGenerating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Architecting Curriculum Outline...
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} />
                            Generate Syllabus Outline
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Generated Blueprint Preview</span>
                      <button type="button"
                        onClick={() => setAiResult(null)}
                        className="text-xs text-purple-400 hover:text-purple-300 font-bold uppercase transition-colors"
                      >
                        Re-generate
                      </button>
                    </div>

                    <div className="space-y-4">
                      {aiResult.modules.map((mod: any, idx: number) => (
                        <div key={idx} className="border border-slate-800 bg-secondary/5 rounded-xl p-4 space-y-3">
                          <span className="text-xs font-bold text-purple-400 block border-b border-slate-800 pb-1">{mod.name}</span>
                          <div className="space-y-2 pl-2">
                            {mod.lessons.map((les: any, lIdx: number) => (
                              <div key={lIdx} className="text-xs bg-slate-900 border border-slate-850 p-2.5 rounded-lg">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-gray-200">{les.title}</span>
                                  <span className="text-[10px] text-gray-500 font-semibold">{les.duration} mins</span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">{les.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-purple-950/10 border border-purple-500/20 p-4 rounded-xl space-y-2">
                      <span className="text-xs text-purple-400 font-bold block uppercase tracking-wider flex items-center gap-1.5">
                        <AlertCircle size={14} />
                        Architect Commitment Notice
                      </span>
                      <p className="text-[10px] text-purple-300 leading-relaxed">
                        Applying this blueprint will immediately append these modules and add these new draft lessons to your course curriculum outline. You can later add video URLs and resources to each draft lesson.
                      </p>
                    </div>

                    <button type="button"
                      onClick={() => handleApplyAiCurriculum(selectedCourseId)}
                      className="w-full py-3 bg-purple-500 hover:bg-purple-650 text-black font-black rounded-xl text-xs uppercase transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      <Check size={14} />
                      Commit Blueprint to Curriculum
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
