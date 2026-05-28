import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, Briefcase, AlertCircle, CheckCircle2,
  Edit2, Trash2, MapPin, DollarSign, Building
} from 'lucide-react';
import {
  getJobListings, createJobListing, updateJobListing, deleteJobListing,
  JobListing
} from '../lib/turso';

const AdminJobs = () => {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    salary: '',
    description: '',
    type: 'full-time' as 'full-time' | 'part-time' | 'internship',
    category: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const j = await getJobListings();
      setJobs(j);
    } catch {
      setError('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (job?: JobListing) => {
    if (job) {
      setEditingJob(job);
      setFormData({
        title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary,
        description: job.description,
        type: job.type,
        category: job.category
      });
    } else {
      setEditingJob(null);
      setFormData({ title: '', company: '', location: '', salary: '', description: '', type: 'full-time', category: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.company.trim()) {
      setError('Title and company are required');
      return;
    }
    try {
      if (editingJob) {
        const updated: JobListing = { ...editingJob, ...formData };
        await updateJobListing(updated);
        setJobs(jobs.map(j => j.id === updated.id ? updated : j));
        setSuccess('Job updated');
      } else {
        const newJob: JobListing = {
          id: `job_${Date.now()}`,
          ...formData,
          created_at: new Date().toISOString()
        };
        await createJobListing(newJob);
        setJobs([newJob, ...jobs]);
        setSuccess('Job listing created');
      }
      setIsModalOpen(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save job listing');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this job listing?')) return;
    try {
      await deleteJobListing(id);
      setJobs(jobs.filter(j => j.id !== id));
      setSuccess('Job listing deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete');
    }
  };

  const typeColors = {
    'full-time': 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    'part-time': 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    'internship': 'bg-purple-500/10 border-purple-500/30 text-purple-400'
  };

  return (
    <div>
      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-emerald-500/10 border border-emerald-500/20 p-4 mb-6 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <p className="text-sm text-emerald-200 font-medium">{success}</p>
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-red-500/10 border border-red-500/20 p-4 mb-6 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-sm text-red-200 font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-gray-400">{jobs.length} job listings posted</p>
        <button onClick={() => handleOpenModal()}
          className="inline-flex items-center px-6 py-3 bg-[#41c8df] hover:bg-[#38b2c7] text-black font-bold rounded-xl transition-all shadow-lg">
          <Plus className="w-5 h-5 mr-2" /> New Job
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#41c8df] rounded-full animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">
            <Briefcase className="w-12 h-12 mx-auto mb-2 text-gray-100" />
            <p className="text-sm font-medium">No job listings yet</p>
          </div>
        ) : jobs.map((job, i) => (
          <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="bg-background/40 backdrop-blur-xl border border-secondary/10 rounded-2xl p-5 shadow-lg hover:border-[#41c8df]/20 transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#41c8df]/10 rounded-xl flex items-center justify-center">
                  <Building className="text-[#41c8df]" size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-secondary">{job.title}</h3>
                  <p className="text-xs text-gray-400">{job.company}</p>
                </div>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${typeColors[job.type] || typeColors['full-time']}`}>
                {job.type}
              </span>
            </div>
            <p className="text-sm text-gray-300 mb-4 line-clamp-2">{job.description}</p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 font-medium">
              <span className="flex items-center gap-1"><MapPin size={14} /> {job.location}</span>
              <span className="flex items-center gap-1"><DollarSign size={14} /> {job.salary}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#41c8df] bg-[#41c8df]/10 px-2 py-0.5 rounded-md">{job.category}</span>
            </div>
            <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleOpenModal(job)}
                className="px-3 py-1.5 text-xs font-bold text-[#41c8df] bg-[#41c8df]/10 hover:bg-[#41c8df]/20 rounded-lg transition-all">Edit</button>
              <button onClick={() => handleDelete(job.id)}
                className="px-3 py-1.5 text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all">Delete</button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Job Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-background/90 backdrop-blur-2xl border border-secondary/20 rounded-[2rem] p-8 w-full max-w-xl shadow-2xl">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all" title="Close">
                <X size={20} />
              </button>
              <h2 className="text-2xl font-display font-bold text-secondary mb-6 flex items-center gap-3">
                <Briefcase className="text-[#41c8df]" /> {editingJob ? 'Edit Job' : 'New Job Listing'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Title *</label>
                    <input type="text" required value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Company *</label>
                    <input type="text" required value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Location</label>
                    <input type="text" value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Salary</label>
                    <input type="text" value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Category</label>
                    <input type="text" value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                      placeholder="e.g., Artificial Intelligence" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Type</label>
                    <select value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                      title="Job Type">
                      <option value="full-time">Full-time</option>
                      <option value="part-time">Part-time</option>
                      <option value="internship">Internship</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Description</label>
                  <textarea rows={3} value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary resize-none" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-secondary/10 text-gray-400 font-bold rounded-xl hover:bg-secondary/5 transition-all">Cancel</button>
                  <button type="submit"
                    className="flex-1 px-6 py-3 bg-[#41c8df] hover:bg-[#38b2c7] text-black font-bold rounded-xl transition-all shadow-lg">
                    {editingJob ? 'Update Job' : 'Create Job'}
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

export default AdminJobs;
