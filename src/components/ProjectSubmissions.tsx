import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, UploadCloud, CheckCircle, Clock, Link as LinkIcon, FileArchive, X } from 'lucide-react';
import { Project, ProjectSubmission, getProjects, getProjectSubmissions, createProjectSubmission } from '../lib/turso';

interface ProjectSubmissionsProps {
  studentId: string;
  enrollments: { course: { id: string; title: string } }[];
}

export const ProjectSubmissions: React.FC<ProjectSubmissionsProps> = ({ studentId, enrollments }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load projects per enrolled course so dynamic generation works
        const courseIds = enrollments.map(e => e.course.id);
        const projectsByCoursePr = courseIds.map(id => getProjects(id));
        const projectsPerCourse = await Promise.all(projectsByCoursePr);
        const allProjects = projectsPerCourse.flat();
        setProjects(allProjects);

        const mySubmissions = await getProjectSubmissions(studentId);
        setSubmissions(mySubmissions);
      } catch (e) {
        console.error('Failed to load projects', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [studentId, enrollments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !submissionUrl) return;
    
    setSubmitting(true);
    try {
      const newSubmission: ProjectSubmission = {
        id: crypto.randomUUID(),
        project_id: selectedProject.id,
        student_id: studentId,
        submission_url: submissionUrl,
        status: 'pending',
        submitted_at: new Date().toISOString()
      };
      
      await createProjectSubmission(newSubmission);
      setSubmissions([...submissions, newSubmission]);
      setSelectedProject(null);
      setSubmissionUrl('');
    } catch (e) {
      console.error("Failed to submit project", e);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'needs_work': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-orange-100 text-orange-700 border-orange-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-secondary/10 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-3xl lg:text-4xl font-black text-secondary mb-2 tracking-tight">Capstone Projects</h3>
        <p className="text-sm lg:text-base text-secondary/60 font-medium">Build, submit, and get feedback on real-world industry projects.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projects.length === 0 ? (
          <div className="col-span-full bg-background-100 border border-secondary/10 rounded-xl p-16 text-center shadow-sm">
            <Briefcase className="w-16 h-16 text-secondary/20 mx-auto mb-4" />
            <h4 className="text-xl font-bold text-secondary mb-2">No Projects Available</h4>
            <p className="text-secondary/60 text-sm">You have no pending projects for your enrolled courses right now.</p>
          </div>
        ) : (
          projects.map(project => {
            const courseName = enrollments.find(e => e.course.id === project.course_id)?.course.title;
            const existingSubmission = submissions.find(s => s.project_id === project.id);
            const isLate = new Date(project.dueDate) < new Date() && !existingSubmission;

            return (
              <div key={project.id} className="bg-background-100 border border-secondary/10 rounded-xl p-8 shadow-sm flex flex-col group hover:border-indigo-500/50 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-indigo-500/10 text-indigo-400 rounded-md border border-indigo-500/20 inline-block mb-3">
                      {courseName}
                    </span>
                    <h4 className="text-xl font-bold text-secondary line-clamp-1 group-hover:text-indigo-400 transition-colors">{project.title}</h4>
                  </div>
                  {existingSubmission ? (
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md border ${getStatusColor(existingSubmission.status)}`}>
                      {existingSubmission.status.replace('_', ' ')}
                    </span>
                  ) : (
                    <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${isLate ? 'text-red-500' : 'text-orange-500'}`}>
                      <Clock size={12} /> {isLate ? 'Overdue' : 'Due: ' + new Date(project.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <p className="text-sm text-secondary/60 mb-6 flex-1 line-clamp-3 leading-relaxed">
                  {project.description}
                </p>

                <div className="mt-auto pt-6 border-t border-secondary/5 flex items-center justify-between">
                  <div className="text-xs font-bold text-secondary/60">
                    Max Score: <span className="text-secondary">{project.maxScore} XP</span>
                  </div>
                  
                  {existingSubmission ? (
                    <div className="text-xs font-bold flex items-center gap-2">
                      {existingSubmission.score ? (
                        <span className="text-emerald-500">Graded: {existingSubmission.score}/{project.maxScore}</span>
                      ) : (
                        <span className="text-orange-500 flex items-center gap-1"><Clock size={14} /> Under Review</span>
                      )}
                    </div>
                  ) : (
                    <button 
                      onClick={() => setSelectedProject(project)}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md text-xs flex items-center gap-2 transition-all shadow-md shadow-indigo-500/10"
                    >
                      <UploadCloud size={14} /> Submit Project
                    </button>
                  )}
                </div>
                
                {existingSubmission?.feedback && (
                  <div className="mt-4 p-4 bg-secondary/5 rounded-md border border-secondary/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-secondary/40 mb-1">Mentor Feedback</p>
                    <p className="text-xs font-medium text-secondary/80 italic">"{existingSubmission.feedback}"</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Submission Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={() => !submitting && setSelectedProject(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background-100 border border-secondary/10 w-full max-w-lg rounded-xl p-8 relative z-10 shadow-2xl"
          >
            <button 
              onClick={() => setSelectedProject(null)} 
              className="absolute top-6 right-6 p-2 bg-secondary/5 text-secondary/40 hover:text-secondary rounded-md transition-all"
            >
              <X size={18} />
            </button>
            
            <h3 className="text-2xl font-bold text-secondary mb-2 pr-10">Submit Project</h3>
            <p className="text-sm font-medium text-secondary/60 mb-6">{selectedProject.title}</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-secondary/40 uppercase tracking-widest flex items-center gap-2 mb-3">
                  <LinkIcon size={12} /> GitHub Repository or Drive Link
                </label>
                <input
                  type="url"
                  required
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  className="w-full bg-secondary/5 border border-secondary/10 rounded-md px-4 py-3.5 focus:border-indigo-500 outline-none text-secondary font-medium transition-all text-sm"
                />
              </div>

              <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-md text-xs font-medium text-secondary/80 flex gap-3">
                <FileArchive className="text-indigo-400 shrink-0" size={16} />
                <p>Make sure your repository or link is publicly accessible so mentors can grade your work.</p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-500/10"
              >
                {submitting ? 'Submitting...' : 'Confirm Submission'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
