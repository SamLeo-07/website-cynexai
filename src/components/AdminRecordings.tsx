import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit2, Trash2, Video, Calendar, Clock, AlertCircle, CheckCircle2,
  BookOpen, Layers, X, PlusCircle, Trash, ListOrdered, UploadCloud, Download
} from 'lucide-react';
import {
  getBatches, createBatch, updateBatch, deleteBatch,
  getDailyRecordings, createDailyRecording, updateDailyRecording, deleteDailyRecording,
  getCourses, Course, Batch, DailyRecording,
  createAttendanceSession, deleteAttendanceSession, AttendanceSession
} from '../lib/turso';

export const AdminRecordings: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [recordings, setRecordings] = useState<DailyRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const handleDownloadBatches = () => {
    const data = batches.map(b => {
      const course = courses.find(c => c.id === b.course_id);
      return {
        ID: b.id,
        Name: b.name,
        Course: course ? course.title : 'General'
      };
    });
    exportToCSV(data, 'batches_sections_report.csv', ['Section ID', 'Section Name', 'Assigned Course']);
  };

  const handleDownloadRecordings = () => {
    const data = recordings.map(r => {
      const batch = batches.find(b => b.id === r.batch_id);
      return {
        ID: r.id,
        Batch: batch ? batch.name : r.batch_id,
        Subject: r.subject,
        Title: r.title,
        Description: r.description || 'N/A',
        VideoURL: r.video_url,
        Duration: r.duration || 'N/A',
        Date: r.recording_date
      };
    });
    exportToCSV(data, 'class_recordings_report.csv', ['Recording ID', 'Section Name', 'Subject', 'Title', 'Description', 'Video URL', 'Duration', 'Recording Date']);
  };

  // File Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Modal control
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isRecModalOpen, setIsRecModalOpen] = useState(false);

  // Editing state
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [editingRecording, setEditingRecording] = useState<DailyRecording | null>(null);

  // Form states
  const [batchForm, setBatchForm] = useState({
    name: '',
    course_id: ''
  });

  const [recForm, setRecForm] = useState({
    batch_id: '',
    subject: '',
    title: '',
    description: '',
    video_url: '',
    duration: '',
    recording_date: new Date().toISOString().split('T')[0],
  });

  interface ChapterInput {
    time: string;
    title: string;
  }
  const [chapters, setChapters] = useState<ChapterInput[]>([
    { time: '00:00', title: 'Session Introduction' }
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [c, b, r] = await Promise.all([
        getCourses(true),
        getBatches(),
        getDailyRecordings()
      ]);
      setCourses(c);
      setBatches(b);
      setRecordings(r);
      
      // Auto-set defaults for forms if data exists
      if (c.length > 0) {
        setBatchForm(prev => ({ ...prev, course_id: c[0].id }));
      }
      if (b.length > 0) {
        setRecForm(prev => ({ ...prev, batch_id: b[0].id }));
      }
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchForm.name.trim() || !batchForm.course_id) {
      setError('Please provide batch name and select course');
      return;
    }

    try {
      if (editingBatch) {
        const updated: Batch = {
          ...editingBatch,
          name: batchForm.name.trim(),
          course_id: batchForm.course_id
        };
        await updateBatch(updated);
        setSuccess('Batch updated successfully');
      } else {
        const created: Batch = {
          id: `batch_${Date.now()}`,
          name: batchForm.name.trim(),
          course_id: batchForm.course_id
        };
        await createBatch(created);
        setSuccess('Batch created successfully');
      }
      setIsBatchModalOpen(false);
      setEditingBatch(null);
      setBatchForm({ name: '', course_id: courses[0]?.id || '' });
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save batch');
    }
  };

  const handleDeleteBatch = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this batch? All recordings inside it will be deleted!')) return;
    try {
      await deleteBatch(id);
      setSuccess('Batch deleted successfully');
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete batch');
    }
  };

  const handleRecSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recForm.batch_id || !recForm.title.trim() || !recForm.video_url.trim()) {
      setError('Please provide title, select batch/section, and insert video URL');
      return;
    }

    // Parse chapters to JSON string
    const chaptersJson = JSON.stringify(
      chapters.filter(ch => ch.time.trim() && ch.title.trim()).sort((a, b) => a.time.localeCompare(b.time))
    );

    const videoUrlWithFlag = recForm.video_url.trim();

    try {
      if (editingRecording) {
        const updated: DailyRecording = {
          ...editingRecording,
          batch_id: recForm.batch_id,
          subject: recForm.subject,
          title: recForm.title.trim(),
          description: recForm.description.trim(),
          video_url: videoUrlWithFlag,
          duration: recForm.duration.trim() || '1h 30m',
          recording_date: recForm.recording_date,
          chapters: chaptersJson
        };
        await updateDailyRecording(updated);

        // Sync with attendance sessions
        const batch = batches.find(b => b.id === recForm.batch_id);
        if (batch) {
          const sess: AttendanceSession = {
            id: `sess_rec_${editingRecording.id}`,
            course_id: batch.course_id,
            session_date: recForm.recording_date,
            topic: `[Recorded Class] ${recForm.title.trim()}`,
            pin_code: 'AUTO',
            created_by: 'admin',
            created_at: new Date().toISOString()
          };
          await createAttendanceSession(sess);
        }

        setSuccess('Daily recording updated successfully');
      } else {
        const recId = `rec_${Date.now()}`;
        const created: DailyRecording = {
          id: recId,
          batch_id: recForm.batch_id,
          subject: recForm.subject,
          title: recForm.title.trim(),
          description: recForm.description.trim(),
          video_url: videoUrlWithFlag,
          duration: recForm.duration.trim() || '1h 30m',
          recording_date: recForm.recording_date,
          chapters: chaptersJson
        };
        await createDailyRecording(created);

        // Sync with attendance sessions
        const batch = batches.find(b => b.id === recForm.batch_id);
        if (batch) {
          const sess: AttendanceSession = {
            id: `sess_rec_${recId}`,
            course_id: batch.course_id,
            session_date: recForm.recording_date,
            topic: `[Recorded Class] ${recForm.title.trim()}`,
            pin_code: 'AUTO',
            created_by: 'admin',
            created_at: new Date().toISOString()
          };
          await createAttendanceSession(sess);
        }

        setSuccess('Daily recording uploaded successfully');
      }
      setIsRecModalOpen(false);
      setEditingRecording(null);
      setRecForm({
        batch_id: batches[0]?.id || '',
        subject: '',
        title: '',
        description: '',
        video_url: '',
        duration: '',
        recording_date: new Date().toISOString().split('T')[0]
      });
      setChapters([{ time: '00:00', title: 'Session Introduction' }]);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save daily recording');
    }
  };

  const handleDeleteRec = async (id: string) => {
    if (!window.confirm('Delete this class recording?')) return;
    try {
      await deleteDailyRecording(id);
      
      // Also delete corresponding attendance session
      try {
        await deleteAttendanceSession(`sess_rec_${id}`);
      } catch (err) {
        console.error("Failed to delete corresponding attendance session", err);
      }

      setSuccess('Class recording deleted');
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete recording');
    }
  };

  const addChapterRow = () => {
    setChapters([...chapters, { time: '', title: '' }]);
  };

  const removeChapterRow = (index: number) => {
    if (chapters.length === 1) return;
    setChapters(chapters.filter((_, i) => i !== index));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadSuccess(null);
    setUploadError(null);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://tmpfiles.org/api/v1/upload');
    
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.status === 'success' && response.data && response.data.url) {
            const rawUrl = response.data.url;
            const directUrl = rawUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
            setRecForm(prev => ({ ...prev, video_url: directUrl }));
            setUploadSuccess('Video uploaded successfully!');
            setTimeout(() => setUploadSuccess(null), 3000);
          } else {
            setUploadError('Failed to parse upload response.');
          }
        } catch {
          setUploadError('Failed to parse upload response.');
        }
      } else {
        setUploadError('File upload failed. Server returned status: ' + xhr.status);
      }
      setUploading(false);
      setUploadProgress(0);
    };

    xhr.onerror = () => {
      setUploadError('Network error during file upload.');
      setUploading(false);
      setUploadProgress(0);
    };

    const formData = new FormData();
    formData.append('file', file);
    xhr.send(formData);
  };

  const getCourseTitle = (courseId: string) => {
    return courses.find(c => c.id === courseId)?.title || courseId;
  };

  const getBatchName = (batchId: string) => {
    return batches.find(b => b.id === batchId)?.name || batchId;
  };

  return (
    <div className="space-y-8">
      {/* Alert Notifications */}
      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <p className="text-sm text-emerald-200 font-medium">{success}</p>
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-sm text-red-200 font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-secondary/5 border border-secondary/10 rounded-3xl p-6">
        <div>
          <h2 className="text-xl font-bold text-secondary">Recordings & Sections Management</h2>
          <p className="text-xs text-gray-400 mt-1">Daily recorded videos mapped to student learning tracks and sections.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setEditingBatch(null);
              setBatchForm({ name: '', course_id: courses[0]?.id || '' });
              setIsBatchModalOpen(true);
            }}
            className="inline-flex items-center px-5 py-3 bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary/20 font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
          >
            <Layers className="w-4 h-4 mr-2 text-[#41c8df]" /> New Section
          </button>
          <button
            onClick={() => {
              setEditingRecording(null);
              setRecForm({
                batch_id: batches[0]?.id || '',
                subject: '',
                title: '',
                description: '',
                video_url: '',
                duration: '1h 30m',
                recording_date: new Date().toISOString().split('T')[0]
              });
              setChapters([{ time: '00:00', title: 'Session Introduction' }]);
              setIsRecModalOpen(true);
            }}
            disabled={batches.length === 0}
            className="inline-flex items-center px-5 py-3 bg-[#41c8df] text-black hover:bg-[#38b2c7] disabled:opacity-40 font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#41c8df]/10"
          >
            <Video className="w-4 h-4 mr-2" /> Upload Recording
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Batches Column */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Active Batches / Sections ({batches.length})</h3>
            {batches.length > 0 && (
              <button
                onClick={handleDownloadBatches}
                className="inline-flex items-center text-[10px] font-bold text-[#41c8df] hover:underline"
                title="Download batches as CSV"
              >
                <Download className="w-3 h-3 mr-1" /> Download
              </button>
            )}
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 no-scrollbar">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-[#41c8df] rounded-full animate-spin" />
              </div>
            ) : batches.length === 0 ? (
              <div className="bg-background/20 border border-secondary/10 rounded-2xl p-8 text-center text-gray-400 text-sm">
                No Batches / Sections created yet.
              </div>
            ) : (
              batches.map(b => (
                <div key={b.id} className="bg-background/40 border border-secondary/10 rounded-2xl p-5 hover:border-secondary/30 transition-all flex flex-col justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-secondary text-base">{b.name}</h4>
                    <p className="text-[10px] font-black uppercase text-[#41c8df] tracking-wider mt-1.5 flex items-center gap-1.5">
                      <BookOpen size={10} />
                      {getCourseTitle(b.course_id)}
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-2 border-t border-secondary/5 pt-3">
                    <button
                      onClick={() => {
                        setEditingBatch(b);
                        setBatchForm({ name: b.name, course_id: b.course_id });
                        setIsBatchModalOpen(true);
                      }}
                      className="p-2 hover:bg-secondary/10 text-gray-400 hover:text-white rounded-lg transition-all"
                      title="Edit Batch / Section"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteBatch(b.id)}
                      className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg transition-all"
                      title="Delete Batch / Section"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Daily Class Recordings Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Class Recordings Archive ({recordings.length})</h3>
            {recordings.length > 0 && (
              <button
                onClick={handleDownloadRecordings}
                className="inline-flex items-center text-[10px] font-bold text-[#41c8df] hover:underline"
                title="Download class recordings as CSV"
              >
                <Download className="w-3 h-3 mr-1" /> Download
              </button>
            )}
          </div>

          <div className="bg-background/20 border border-secondary/10 rounded-[2.5rem] overflow-hidden shadow-xl">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-[#41c8df] rounded-full animate-spin" />
              </div>
            ) : recordings.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
                <Video className="w-12 h-12 mx-auto mb-4 opacity-30 text-gray-100" />
                <p className="font-bold">No recordings uploaded yet</p>
                <p className="text-xs text-gray-500 mt-1">Click "Upload Recording" to allocate class records.</p>
              </div>
            ) : (
              <div className="divide-y divide-secondary/5 max-h-[600px] overflow-y-auto no-scrollbar">
                {recordings.map(rec => (
                  <div key={rec.id} className="p-6 hover:bg-secondary/5 transition-colors flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="px-2.5 py-0.5 bg-[#41c8df]/15 text-[#41c8df] rounded-md text-[10px] font-black uppercase tracking-wider">
                          {rec.subject}
                        </span>
                        <span className="px-2.5 py-0.5 bg-secondary/10 text-gray-400 rounded-md text-[10px] font-bold">
                          {getBatchName(rec.batch_id)}
                        </span>
                      </div>
                      <h4 className="font-bold text-secondary text-lg">{rec.title}</h4>
                      {rec.description && <p className="text-xs text-gray-400 line-clamp-1">{rec.description}</p>}
                      <div className="flex items-center gap-4 text-slate-500 text-[10px] font-bold">
                        <span className="flex items-center gap-1"><Calendar size={12} /> {rec.recording_date}</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {rec.duration || '1h 30m'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => {
                          setEditingRecording(rec);
                          setRecForm({
                            batch_id: rec.batch_id,
                            subject: rec.subject,
                            title: rec.title,
                            description: rec.description || '',
                            video_url: rec.video_url.replace('#external', ''),
                            duration: rec.duration || '',
                            recording_date: rec.recording_date
                          });
                          try {
                            const parsed = rec.chapters ? JSON.parse(rec.chapters) : [];
                            setChapters(parsed.length > 0 ? parsed : [{ time: '00:00', title: 'Session Introduction' }]);
                          } catch {
                            setChapters([{ time: '00:00', title: 'Session Introduction' }]);
                          }
                          setIsRecModalOpen(true);
                        }}
                        className="px-3 py-2 bg-secondary/10 hover:bg-secondary/20 text-gray-300 rounded-xl transition-all text-xs font-bold flex items-center gap-1.5"
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRec(rec.id)}
                        className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all"
                        title="Delete Recording"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Batch Modal */}
      <AnimatePresence>
        {isBatchModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsBatchModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-background/90 backdrop-blur-2xl border border-secondary/20 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
              <button onClick={() => setIsBatchModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all" title="Close">
                <X size={18} />
              </button>
              
              <h2 className="text-xl font-bold text-secondary mb-6 flex items-center gap-3">
                <Layers className="text-[#41c8df]" /> {editingBatch ? 'Edit Batch / Section' : 'Create New Batch / Section'}
              </h2>

              <form onSubmit={handleBatchSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Select Course *</label>
                  <select
                    value={batchForm.course_id}
                    onChange={(e) => setBatchForm({ ...batchForm, course_id: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                    title="Select Course"
                  >
                    <option value="" disabled>-- Select Course --</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Batch / Section Name *</label>
                  <input
                    type="text"
                    required
                    value={batchForm.name}
                    onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                    placeholder="e.g., Java Full Stack - Section A"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-secondary/5">
                  <button type="button" onClick={() => setIsBatchModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-secondary/10 text-gray-400 font-bold rounded-xl text-xs uppercase hover:bg-secondary/5 transition-all">
                    Cancel
                  </button>
                  <button type="submit"
                    className="flex-1 px-6 py-3 bg-[#41c8df] hover:bg-[#38b2c7] text-black font-black rounded-xl text-xs uppercase transition-all shadow-lg">
                    {editingBatch ? 'Update Batch / Section' : 'Create Batch / Section'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Recording Modal */}
      <AnimatePresence>
        {isRecModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsRecModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-background/90 backdrop-blur-2xl border border-secondary/20 rounded-[2.5rem] p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
              <button onClick={() => setIsRecModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all" title="Close">
                <X size={18} />
              </button>
              
              <h2 className="text-xl font-bold text-secondary mb-6 flex items-center gap-3">
                <Video className="text-[#41c8df]" /> {editingRecording ? 'Edit Class Recording' : 'Upload Daily Recording'}
              </h2>

              <form onSubmit={handleRecSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Target Batch / Section *</label>
                    <select
                      value={recForm.batch_id}
                      onChange={(e) => setRecForm({ ...recForm, batch_id: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                      title="Select Batch / Section"
                    >
                      <option value="" disabled>-- Select Batch / Section --</option>
                      {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Subject *</label>
                    <input
                      type="text"
                      required
                      value={recForm.subject}
                      onChange={(e) => setRecForm({ ...recForm, subject: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                      placeholder="e.g., Python"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Recording Title *</label>
                    <input
                      type="text"
                      required
                      value={recForm.title}
                      onChange={(e) => setRecForm({ ...recForm, title: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                      placeholder="e.g., Python Lists and Tuples Deep Dive"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Description</label>
                    <textarea
                      rows={2}
                      value={recForm.description}
                      onChange={(e) => setRecForm({ ...recForm, description: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary resize-none"
                      placeholder="Brief overview of topic, homework assigned, etc."
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Video URL (YouTube, Vimeo, or direct link) *</label>
                    <input
                      type="text"
                      required
                      value={recForm.video_url}
                      onChange={(e) => setRecForm({ ...recForm, video_url: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                      placeholder="e.g., https://www.w3schools.com/html/mov_bbb.mp4 or YouTube / Vimeo URL"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Or Upload Video File Directly</label>
                    <div className="relative border-2 border-dashed border-secondary/15 rounded-2xl p-6 bg-secondary/5 text-center flex flex-col items-center justify-center gap-3 hover:border-[#41c8df]/50 hover:bg-secondary/10 transition-all cursor-pointer group">
                      <input 
                        type="file" 
                        accept="video/*" 
                        onChange={handleFileUpload} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                        disabled={uploading}
                      />
                      {uploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#41c8df] rounded-full animate-spin" />
                          <p className="text-xs font-bold text-secondary">Uploading Video... {uploadProgress}%</p>
                          <div className="w-48 h-1.5 bg-secondary/10 rounded-full overflow-hidden mt-1">
                            <div className="h-full bg-[#41c8df]" style={{ width: `${uploadProgress}%` }} />
                          </div>
                        </div>
                      ) : (
                        <>
                          <UploadCloud className="w-8 h-8 text-[#41c8df] group-hover:scale-110 transition-transform" />
                          <div>
                            <p className="text-xs font-bold text-secondary">Click to upload class recording</p>
                            <p className="text-[10px] text-gray-500 mt-1">MP4, WEBM, or any video format (Max 2GB)</p>
                          </div>
                        </>
                      )}
                    </div>
                    {uploadSuccess && (
                      <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 mt-1.5">
                        <CheckCircle2 size={12} /> {uploadSuccess}
                      </p>
                    )}
                    {uploadError && (
                      <p className="text-xs text-red-400 font-medium flex items-center gap-1.5 mt-1.5">
                        <AlertCircle size={12} /> {uploadError}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Duration</label>
                    <input
                      type="text"
                      value={recForm.duration}
                      onChange={(e) => setRecForm({ ...recForm, duration: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                      placeholder="e.g., 1h 45m"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Recording Date *</label>
                    <input
                      type="date"
                      required
                      value={recForm.recording_date}
                      onChange={(e) => setRecForm({ ...recForm, recording_date: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                    />
                  </div>
                </div>

                {/* Chapters list */}
                <div className="space-y-3 border-t border-secondary/10 pt-5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <ListOrdered size={14} className="text-[#41c8df]" /> Video Chapters & Timestamps
                    </label>
                    <button
                      type="button"
                      onClick={addChapterRow}
                      className="inline-flex items-center px-3 py-1.5 bg-[#41c8df]/10 text-[#41c8df] hover:bg-[#41c8df]/20 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all"
                    >
                      <PlusCircle size={12} className="mr-1" /> Add Chapter
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 no-scrollbar">
                    {chapters.map((ch, idx) => (
                      <div key={idx} className="flex gap-3 items-center">
                        <input
                          type="text"
                          required
                          value={ch.time}
                          onChange={(e) => {
                            const newCh = [...chapters];
                            newCh[idx].time = e.target.value;
                            setChapters(newCh);
                          }}
                          className="w-24 px-3 py-2 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary text-xs font-mono text-center"
                          placeholder="e.g. 15:30"
                        />
                        <input
                          type="text"
                          required
                          value={ch.title}
                          onChange={(e) => {
                            const newCh = [...chapters];
                            newCh[idx].title = e.target.value;
                            setChapters(newCh);
                          }}
                          className="flex-1 px-4 py-2 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary text-xs"
                          placeholder="Chapter name (e.g. Setting up Virtualenv)"
                        />
                        <button
                          type="button"
                          onClick={() => removeChapterRow(idx)}
                          disabled={chapters.length === 1}
                          className="p-2 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded-lg disabled:opacity-30 transition-all"
                          title="Remove"
                        >
                          <Trash size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-5 border-t border-secondary/10">
                  <button type="button" onClick={() => setIsRecModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-secondary/10 text-gray-400 font-bold rounded-xl text-xs uppercase hover:bg-secondary/5 transition-all">
                    Cancel
                  </button>
                  <button type="submit"
                    className="flex-1 px-6 py-3 bg-[#41c8df] hover:bg-[#38b2c7] text-black font-black rounded-xl text-xs uppercase transition-all shadow-lg">
                    {editingRecording ? 'Save Changes' : 'Upload Video'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
