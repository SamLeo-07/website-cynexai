import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, Save, X, Search, HelpCircle, Download } from 'lucide-react';
import { getFaqs, createFaq, updateFaq, deleteFaq, FAQItem } from '../lib/turso';

export const AdminFAQ = () => {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

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

  const handleDownloadFAQs = () => {
    const data = faqs.map(f => ({
      ID: f.id,
      Question: f.question,
      Answer: f.answer,
      Visible: f.isVisible ? 'Yes' : 'No',
      OrderIndex: f.order_index || 0
    }));
    exportToCSV(data, 'faqs_report.csv', ['FAQ ID', 'Question', 'Answer', 'Visible', 'Order Index']);
  };

  // Form states
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [orderIndex, setOrderIndex] = useState(0);

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const data = await getFaqs(true); // true to fetch all FAQs including hidden
      // Sort by order_index
      data.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      setFaqs(data);
    } catch (error) {
      console.error('Failed to load FAQs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (faq: FAQItem) => {
    setEditingId(faq.id);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setIsVisible(faq.isVisible);
    setOrderIndex(faq.order_index || 0);
    setIsAdding(false);
  };

  const handleAddNew = () => {
    setIsAdding(true);
    setEditingId(null);
    setQuestion('');
    setAnswer('');
    setIsVisible(true);
    setOrderIndex(faqs.length);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setQuestion('');
    setAnswer('');
  };

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) return;

    const newFaq: FAQItem = {
      id: editingId || `faq_${Date.now()}`,
      question,
      answer,
      isVisible,
      order_index: orderIndex
    };

    try {
      if (editingId) {
        await updateFaq(newFaq);
      } else {
        await createFaq(newFaq);
      }
      await fetchFaqs();
      handleCancel();
    } catch (error) {
      console.error('Failed to save FAQ:', error);
      alert('Failed to save FAQ. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this FAQ?')) {
      try {
        await deleteFaq(id);
        await fetchFaqs();
      } catch (error) {
        console.error('Failed to delete FAQ:', error);
        alert('Failed to delete FAQ.');
      }
    }
  };

  const toggleVisibility = async (faq: FAQItem) => {
    try {
      await updateFaq({ ...faq, isVisible: !faq.isVisible });
      await fetchFaqs();
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
    }
  };

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-[#0891b2]" />
            Manage FAQs
          </h2>
          <p className="text-slate-500 text-sm mt-1">Add, edit, and organize frequently asked questions.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {faqs.length > 0 && (
            <button
              onClick={handleDownloadFAQs}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
              title="Download FAQs as CSV"
            >
              <Download size={18} />
              Download Report
            </button>
          )}
          <button
            onClick={handleAddNew}
            disabled={isAdding || editingId !== null}
            className="bg-[#41c8df] hover:bg-[#0891b2] text-black hover:text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Plus size={18} />
            Add FAQ
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-2">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search FAQs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent border-none focus:ring-0 text-slate-800 placeholder:text-slate-400"
        />
      </div>

      {(isAdding || editingId) && (
        <div className="bg-white p-6 rounded-xl border border-[#41c8df] shadow-sm mb-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">
            {isAdding ? 'Add New FAQ' : 'Edit FAQ'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Question</label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#41c8df] focus:border-transparent"
                placeholder="e.g., What makes CynexAI's curriculum different?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Answer</label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg h-32 focus:ring-2 focus:ring-[#41c8df] focus:border-transparent"
                placeholder="Provide a detailed answer..."
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Order Index</label>
                <input
                  type="number"
                  value={orderIndex}
                  onChange={(e) => setOrderIndex(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#41c8df]"
                />
              </div>
              <div className="flex-1 flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={(e) => setIsVisible(e.target.checked)}
                    className="rounded border-slate-300 text-[#0891b2] focus:ring-[#41c8df] w-5 h-5"
                  />
                  <span className="text-slate-700 font-medium">Visible to Users</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!question.trim() || !answer.trim()}
                className="px-4 py-2 bg-[#41c8df] text-black hover:bg-[#0891b2] hover:text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={18} />
                Save FAQ
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-4 border-[#41c8df] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No FAQs found. Add some to get started.</p>
            </div>
          ) : (
            filteredFaqs.map((faq) => (
              <div
                key={faq.id}
                className={`bg-white p-5 rounded-xl border transition-all ${
                  !faq.isVisible ? 'border-slate-200 opacity-75' : 'border-slate-200 hover:border-[#41c8df]/50 hover:shadow-md'
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded">
                        #{faq.order_index || 0}
                      </span>
                      <h4 className={`text-lg font-bold ${!faq.isVisible ? 'text-slate-500' : 'text-slate-800'}`}>
                        {faq.question}
                      </h4>
                      {!faq.isVisible && (
                        <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                          <EyeOff size={12} /> Hidden
                        </span>
                      )}
                    </div>
                    <p className={`text-sm whitespace-pre-wrap ${!faq.isVisible ? 'text-slate-400' : 'text-slate-600'}`}>
                      {faq.answer}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleVisibility(faq)}
                      className={`p-2 rounded-lg transition-colors ${
                        faq.isVisible ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                      }`}
                      title={faq.isVisible ? "Hide FAQ" : "Show FAQ"}
                    >
                      {faq.isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    <button
                      onClick={() => handleEdit(faq)}
                      disabled={isAdding || editingId !== null}
                      className="p-2 text-slate-400 hover:text-[#0891b2] hover:bg-[#41c8df]/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(faq.id)}
                      disabled={isAdding || editingId !== null}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
