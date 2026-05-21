import React from 'react';
import { X, Plus, Image as ImageIcon } from 'lucide-react';
import { Course } from '../lib/turso';

interface AdminCourseFormProps {
  editingCourse: Course | null;
  courseFormData: {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    image: string;
    duration: string;
    placement: string;
    students: string;
    rating: number;
    level: string;
    skills: string[];
    modules: string[];
    outcomes: string[];
    prerequisites: string[];
    career: string[];
  };
  setCourseFormData: React.Dispatch<React.SetStateAction<{
    id: string;
    title: string;
    subtitle: string;
    description: string;
    image: string;
    duration: string;
    placement: string;
    students: string;
    rating: number;
    level: string;
    skills: string[];
    modules: string[];
    outcomes: string[];
    prerequisites: string[];
    career: string[];
  }>>;
  formLoading: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
}

const AdminCourseForm: React.FC<AdminCourseFormProps> = ({
  editingCourse,
  courseFormData,
  setCourseFormData,
  formLoading,
  onSubmit,
  onCancel,
}) => {
  return (
    <>
      <div className="px-8 py-6 border-b border-secondary/10 flex items-center justify-between bg-secondary/5">
        <div>
          <h2 className="text-2xl font-display font-bold text-secondary">
            {editingCourse ? 'Edit Course' : 'New Course'}
          </h2>
          <p className="text-sm text-gray-400 uppercase tracking-widest font-bold mt-1">
            Define course curriculum and details
          </p>
        </div>
        <button
          onClick={onCancel}
          aria-label="Close course modal"
          className="p-3 text-gray-400 hover:text-secondary hover:bg-secondary/10 rounded-2xl transition-all border border-transparent hover:border-secondary/20"
        >
          <X size={24} />
        </button>
      </div>

      <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">

        {/* Section 1: Hero Info */}
        <div>
          <p className="text-xs font-black text-[#41c8df] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#41c8df]/10 rounded-full flex items-center justify-center text-[10px]">1</span>
            Hero Section
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Course Title *</label>
                <input required type="text" id="course-title" aria-label="Course title"
                  placeholder="e.g., Data Science & Machine Learning"
                  value={courseFormData.title}
                  onChange={(e) => setCourseFormData({ ...courseFormData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none transition-all text-secondary font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Subtitle</label>
                <input type="text"
                  placeholder="e.g., Unlock Insights from Data & Build Predictive Models"
                  value={courseFormData.subtitle}
                  onChange={(e) => setCourseFormData({ ...courseFormData, subtitle: e.target.value })}
                  className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none transition-all text-secondary"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Description *</label>
                <textarea required
                  value={courseFormData.description}
                  onChange={(e) => setCourseFormData({ ...courseFormData, description: e.target.value })}
                  className="w-full h-28 p-4 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl text-secondary resize-none outline-none"
                  placeholder="Full course description shown in hero section..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Duration</label>
                  <input type="text" placeholder="e.g., 6 months"
                    value={courseFormData.duration}
                    onChange={(e) => setCourseFormData({ ...courseFormData, duration: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Placement %</label>
                  <input type="text" placeholder="e.g., 95%"
                    value={courseFormData.placement}
                    onChange={(e) => setCourseFormData({ ...courseFormData, placement: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Level</label>
                  <select id="course-level" aria-label="Course level" title="Course level"
                    value={courseFormData.level}
                    onChange={(e) => setCourseFormData({ ...courseFormData, level: e.target.value })}
                    className="w-full px-3 py-3 bg-secondary/5 border border-secondary/10 rounded-xl outline-none text-secondary text-sm"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Professional">Professional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Students</label>
                  <input type="text" placeholder="e.g., 150+"
                    value={courseFormData.students}
                    onChange={(e) => setCourseFormData({ ...courseFormData, students: e.target.value })}
                    className="w-full px-3 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Rating</label>
                  <input type="number" step="0.1" min="1" max="5" id="course-rating" aria-label="Course rating"
                    placeholder="4.8"
                    value={courseFormData.rating}
                    onChange={(e) => setCourseFormData({ ...courseFormData, rating: parseFloat(e.target.value) })}
                    className="w-full px-3 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Course ID (Slug)</label>
                <input type="text" placeholder="e.g., ai-ml-bootcamp (auto-generated if empty)"
                  value={courseFormData.id}
                  onChange={(e) => setCourseFormData({ ...courseFormData, id: e.target.value })}
                  className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 rounded-xl outline-none text-secondary text-xs font-mono"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Course Image URL</label>
                <input type="text" placeholder="https://... or /local-image.png"
                  value={courseFormData.image}
                  onChange={(e) => setCourseFormData({ ...courseFormData, image: e.target.value })}
                  className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary text-sm"
                />
              </div>
              <div className="w-full h-48 rounded-xl overflow-hidden border border-secondary/10 bg-secondary/5 flex items-center justify-center">
                {courseFormData.image
                  ? <img src={courseFormData.image} className="w-full h-full object-cover" alt="Preview" />
                  : <div className="flex flex-col items-center text-gray-500"><ImageIcon size={32} /><span className="text-xs mt-2">No Image</span></div>
                }
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Skills */}
        <div className="border-t border-secondary/10 pt-8">
          <p className="text-xs font-black text-[#41c8df] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#41c8df]/10 rounded-full flex items-center justify-center text-[10px]">2</span>
            Skills You'll Gain
          </p>
          <div className="space-y-2">
            {courseFormData.skills.map((skill, i) => (
              <div key={i} className="flex gap-2">
                <input type="text" value={skill}
                  onChange={(e) => { const u = [...courseFormData.skills]; u[i] = e.target.value; setCourseFormData({ ...courseFormData, skills: u }); }}
                  placeholder="e.g., Python"
                  className="flex-1 px-4 py-2.5 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary text-sm"
                />
                <button type="button" 
                  onClick={() => setCourseFormData({ ...courseFormData, skills: courseFormData.skills.filter((_, idx) => idx !== i) })}
                  className="p-2.5 text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                  title="Remove skill"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setCourseFormData({ ...courseFormData, skills: [...courseFormData.skills, ''] })}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#41c8df]/10 text-[#41c8df] rounded-xl text-sm font-bold hover:bg-[#41c8df]/20 transition-all">
              <Plus size={14} /> Add Skill
            </button>
          </div>
        </div>

        {/* Section 3: Learning Outcomes */}
        <div className="border-t border-secondary/10 pt-8">
          <p className="text-xs font-black text-[#41c8df] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#41c8df]/10 rounded-full flex items-center justify-center text-[10px]">3</span>
            Learning Outcomes (What You'll Learn)
          </p>
          <div className="space-y-2">
            {courseFormData.outcomes.map((item, i) => (
              <div key={i} className="flex gap-2">
                <input type="text" value={item}
                  onChange={(e) => { const u = [...courseFormData.outcomes]; u[i] = e.target.value; setCourseFormData({ ...courseFormData, outcomes: u }); }}
                  placeholder="e.g., Build end-to-end machine learning pipelines"
                  className="flex-1 px-4 py-2.5 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary text-sm"
                />
                <button type="button" 
                  onClick={() => setCourseFormData({ ...courseFormData, outcomes: courseFormData.outcomes.filter((_, idx) => idx !== i) })}
                  className="p-2.5 text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                  title="Remove outcome"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setCourseFormData({ ...courseFormData, outcomes: [...courseFormData.outcomes, ''] })}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#41c8df]/10 text-[#41c8df] rounded-xl text-sm font-bold hover:bg-[#41c8df]/20 transition-all">
              <Plus size={14} /> Add Outcome
            </button>
          </div>
        </div>

        {/* Section 4: Curriculum Modules */}
        <div className="border-t border-secondary/10 pt-8">
          <p className="text-xs font-black text-[#41c8df] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#41c8df]/10 rounded-full flex items-center justify-center text-[10px]">4</span>
            Course Curriculum (Modules)
          </p>
          <div className="space-y-2">
            {courseFormData.modules.map((mod, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="w-7 h-7 bg-[#41c8df] text-black rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                <input type="text" value={mod}
                  onChange={(e) => { const u = [...courseFormData.modules]; u[i] = e.target.value; setCourseFormData({ ...courseFormData, modules: u }); }}
                  placeholder="e.g., Python Programming Fundamentals"
                  className="flex-1 px-4 py-2.5 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary text-sm"
                />
                <button type="button" 
                  onClick={() => setCourseFormData({ ...courseFormData, modules: courseFormData.modules.filter((_, idx) => idx !== i) })}
                  className="p-2.5 text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                  title="Remove module"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setCourseFormData({ ...courseFormData, modules: [...courseFormData.modules, ''] })}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#41c8df]/10 text-[#41c8df] rounded-xl text-sm font-bold hover:bg-[#41c8df]/20 transition-all">
              <Plus size={14} /> Add Module
            </button>
          </div>
        </div>

        {/* Section 5: Prerequisites */}
        <div className="border-t border-secondary/10 pt-8">
          <p className="text-xs font-black text-[#41c8df] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#41c8df]/10 rounded-full flex items-center justify-center text-[10px]">5</span>
            Prerequisites
          </p>
          <div className="space-y-2">
            {courseFormData.prerequisites.map((item, i) => (
              <div key={i} className="flex gap-2">
                <input type="text" value={item}
                  onChange={(e) => { const u = [...courseFormData.prerequisites]; u[i] = e.target.value; setCourseFormData({ ...courseFormData, prerequisites: u }); }}
                  placeholder="e.g., Basic programming knowledge (Python preferred)"
                  className="flex-1 px-4 py-2.5 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary text-sm"
                />
                <button type="button" 
                  onClick={() => setCourseFormData({ ...courseFormData, prerequisites: courseFormData.prerequisites.filter((_, idx) => idx !== i) })}
                  className="p-2.5 text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                  title="Remove prerequisite"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setCourseFormData({ ...courseFormData, prerequisites: [...courseFormData.prerequisites, ''] })}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#41c8df]/10 text-[#41c8df] rounded-xl text-sm font-bold hover:bg-[#41c8df]/20 transition-all">
              <Plus size={14} /> Add Prerequisite
            </button>
          </div>
        </div>

        {/* Section 6: Career Paths */}
        <div className="border-t border-secondary/10 pt-8">
          <p className="text-xs font-black text-[#41c8df] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#41c8df]/10 rounded-full flex items-center justify-center text-[10px]">6</span>
            Potential Career Paths
          </p>
          <div className="space-y-2">
            {courseFormData.career.map((item, i) => (
              <div key={i} className="flex gap-2">
                <input type="text" value={item}
                  onChange={(e) => { const u = [...courseFormData.career]; u[i] = e.target.value; setCourseFormData({ ...courseFormData, career: u }); }}
                  placeholder="e.g., Data Scientist"
                  className="flex-1 px-4 py-2.5 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary text-sm"
                />
                <button type="button" 
                  onClick={() => setCourseFormData({ ...courseFormData, career: courseFormData.career.filter((_, idx) => idx !== i) })}
                  className="p-2.5 text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                  title="Remove career path"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setCourseFormData({ ...courseFormData, career: [...courseFormData.career, ''] })}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#41c8df]/10 text-[#41c8df] rounded-xl text-sm font-bold hover:bg-[#41c8df]/20 transition-all">
              <Plus size={14} /> Add Career Path
            </button>
          </div>
        </div>

        <div className="border-t border-secondary/10 pt-6 flex flex-col sm:flex-row items-center justify-end gap-4">
          <button type="button" onClick={onCancel} className="px-8 py-4 text-gray-400 hover:text-secondary font-bold uppercase text-xs">Cancel</button>
          <button type="submit" disabled={formLoading} className="px-10 py-4 bg-[#41c8df] text-black font-black uppercase text-xs rounded-2xl transition-all shadow-xl disabled:opacity-50">
            {formLoading ? 'Saving...' : editingCourse ? 'Update Course' : 'Create Course'}
          </button>
        </div>
      </form>
    </>
  );
};

export default AdminCourseForm;
