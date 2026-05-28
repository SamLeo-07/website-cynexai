import React from 'react';
import { X, Type, Eye, EyeOff, Image as ImageIcon } from 'lucide-react';
import { Post } from '../lib/turso';

interface AdminArticleFormProps {
  editingPost: Post | null;
  formData: Omit<Post, 'id' | 'date'>;
  setFormData: React.Dispatch<React.SetStateAction<Omit<Post, 'id' | 'date'>>>;
  formLoading: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
}

const AdminArticleForm: React.FC<AdminArticleFormProps> = ({
  editingPost,
  formData,
  setFormData,
  formLoading,
  onSubmit,
  onCancel,
}) => {
  return (
    <>
      <div className="px-8 py-6 border-b border-secondary/10 flex items-center justify-between bg-secondary/5">
        <div>
          <h2 className="text-2xl font-display font-bold text-secondary">
            {editingPost ? 'Edit Article' : 'New Article'}
          </h2>
          <p className="text-sm text-gray-400 uppercase tracking-widest font-bold mt-1">
            {editingPost ? 'Update existing content' : 'Create high-signal insights'}
          </p>
        </div>
        <button
          onClick={onCancel}
          aria-label="Close article modal"
          className="p-3 text-gray-400 hover:text-secondary hover:bg-secondary/10 rounded-2xl transition-all border border-transparent hover:border-secondary/20"
        >
          <X size={24} />
        </button>
      </div>

      <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Article Title</label>
              <div className="relative group">
                <Type className="absolute left-4 top-4 text-gray-500 group-focus-within:text-[#41c8df] transition-colors" size={18} />
                <input
                  required
                  type="text"
                  id="article-title"
                  aria-label="Article title"
                  placeholder="Enter article title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 bg-secondary/5 border border-secondary/10 focus:bg-secondary/10 focus:border-[#41c8df] rounded-2xl outline-none transition-all text-secondary font-bold placeholder:text-gray-600"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative group">
                <select
                  id="article-category"
                  aria-label="Article category"
                  title="Select article category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-4 bg-secondary/5 border border-secondary/10 rounded-2xl outline-none text-secondary font-bold"
                >
                  <option value="AI Insights">AI Insights</option>
                  <option value="Tutorials">Tutorials</option>
                  <option value="Case Studies">Case Studies</option>
                  <option value="Industry Trends">Industry Trends</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isVisible: !formData.isVisible })}
                className={`w-full py-4 px-4 rounded-2xl font-bold flex items-center justify-center gap-2 border transition-all ${formData.isVisible ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-secondary/5 border-secondary/10 text-gray-400'}`}
              >
                {formData.isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                {formData.isVisible ? 'Visible' : 'Hidden'}
              </button>
            </div>
          </div>
          <div className="space-y-6">
            <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Cover Image URL / Upload</label>
            <div className="space-y-4">
              <input
                type="text"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="Paste image URL here..."
                className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 rounded-xl text-secondary text-sm"
              />
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-secondary/10 bg-secondary/5">
                {formData.image ? <img src={formData.image} className="w-full h-full object-cover" alt="" /> : <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500"><ImageIcon className="mb-2" /><span>No Image</span></div>}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8">
          <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Article Content (Markdown)</label>
          <textarea
            required
            id="article-content"
            aria-label="Article content in Markdown"
            placeholder="Write your article content here (Markdown supported)..."
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="w-full h-[320px] p-6 bg-secondary/5 border border-secondary/10 focus:bg-secondary/10 focus:border-[#41c8df] rounded-[2rem] outline-none transition-all text-secondary leading-relaxed font-medium resize-none"
          />
        </div>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-end gap-4">
          <button type="button" onClick={onCancel} className="px-8 py-4 text-gray-400 hover:text-secondary font-bold uppercase text-xs">Cancel</button>
          <button type="submit" disabled={formLoading} className="px-10 py-4 bg-[#41c8df] text-black font-black uppercase text-xs rounded-2xl transition-all shadow-xl disabled:opacity-50">
            {formLoading ? 'Processing...' : editingPost ? 'Update Post' : 'Publish Article'}
          </button>
        </div>
      </form>
    </>
  );
};

export default AdminArticleForm;
