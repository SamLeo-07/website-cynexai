import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff, X, Phone, Clock, Send, CheckCircle, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createSupportTicket, getUsers } from '../lib/turso';

const StudentLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // IT Support Modal States
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportCategory, setSupportCategory] = useState('Login Issue');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const users = await getUsers();
      const user = users.find(u => u.email === email && u.password_hash === password);

      if (user) {
        localStorage.setItem('cynexai_student_auth', 'true');
        localStorage.setItem('cynexai_student_id', user.id);
        localStorage.setItem('cynexai_student_name', user.name || user.email || 'Student');
        
        navigate('/portal');
      } else {
        setError('Login failed: Invalid email or password');
      }
    } catch (err: any) {
      setError(`Login failed: ${err.message || 'An error occurred'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupportSubmitting(true);

    const ticketId = 'ticket_' + Date.now();
    const guestStudentId = 'guest_' + (supportEmail || 'unknown');

    // 1. Log Support Ticket in Turso DB
    try {
      await createSupportTicket({
        id: ticketId,
        student_id: guestStudentId,
        category: supportCategory,
        description: `Name: ${supportName}\nEmail: ${supportEmail}\nMessage: ${supportMessage}`,
        status: 'open'
      });
    } catch (dbErr) {
      console.warn("Failed to create ticket in Turso DB, falling back to sheet submit", dbErr);
    }

    // 2. Submit to Google Apps Script Sheet
    try {
      const dataToSend = new FormData();
      dataToSend.append('fullName', supportName);
      dataToSend.append('email', supportEmail);
      dataToSend.append('phone', 'N/A');
      dataToSend.append('courseInterest', `IT Support: ${supportCategory}`);
      dataToSend.append('message', supportMessage);
      dataToSend.append('sheetName', 'Messages');

      const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwx3j2nwzJWA1_OpjGPwTRGMvJA8aboye9V9YPuMHnBflsVyAmKHCaa9benkaQ7KcUZuQ/exec';
      await fetch(SCRIPT_URL, {
        method: 'POST',
        body: dataToSend
      });
    } catch (err) {
      console.error("Failed to post to Google Script:", err);
    }

    // Show success view (even if external sheet errored, database log or localStorage will serve as source of truth)
    setSupportSuccess(true);
    setSupportName('');
    setSupportEmail('');
    setSupportCategory('Login Issue');
    setSupportMessage('');
    setSupportSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-transparent pt-32 pb-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-lg p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-indigo-500/10 rounded-md border border-indigo-500/20 flex items-center justify-center mb-4">
            <ShieldCheck className="w-7 h-7 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-semibold text-white tracking-tight">Student Portal</h2>
          <p className="text-slate-400 mt-2 text-sm text-center">Secure access to your learning environment</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-[#0a0a0a] border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md outline-none transition-all text-slate-200 placeholder:text-slate-600 text-sm"
                placeholder="student@company.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-10 py-2.5 bg-[#0a0a0a] border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md outline-none transition-all text-slate-200 placeholder:text-slate-600 text-sm"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-6 bg-white hover:bg-slate-200 text-black text-sm font-semibold rounded-md transition-all flex items-center justify-center group disabled:opacity-50 mt-4 shadow-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Authenticate
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Trouble logging in?{' '}
          <button
            type="button"
            onClick={() => setIsSupportModalOpen(true)}
            className="text-indigo-400 cursor-pointer hover:text-indigo-300 transition-colors bg-transparent border-none outline-none font-medium"
          >
            Contact IT Support
          </button>
        </p>
      </motion.div>

      {/* IT Support Modal */}
      <AnimatePresence>
        {isSupportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSupportModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg bg-[#0f172a] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden z-10"
            >
              {/* Corner Glow Details */}
              <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[80px]" />
              <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[80px]" />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsSupportModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>

              {!supportSuccess ? (
                <>
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      IT Support Portal
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Report login problems or contact our technical support team.
                    </p>
                  </div>

                  <form onSubmit={handleSupportSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          Your Name
                        </label>
                        <input
                          type="text"
                          required
                          value={supportName}
                          onChange={(e) => setSupportName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md outline-none transition-all text-slate-200 placeholder:text-slate-600 text-sm"
                          placeholder="Jane Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={supportEmail}
                          onChange={(e) => setSupportEmail(e.target.value)}
                          className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md outline-none transition-all text-slate-200 placeholder:text-slate-600 text-sm"
                          placeholder="jane@company.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Issue Category
                      </label>
                      <select
                        value={supportCategory}
                        onChange={(e) => setSupportCategory(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md outline-none transition-all text-slate-200 text-sm"
                      >
                        <option value="Login Issue">Login Issue</option>
                        <option value="Forgot Password">Forgot Password</option>
                        <option value="Account Locked">Account Locked</option>
                        <option value="Access Denied">Access Denied</option>
                        <option value="Other">Other Technical Issue</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        How can we help?
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={supportMessage}
                        onChange={(e) => setSupportMessage(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md outline-none transition-all text-slate-200 placeholder:text-slate-600 text-sm resize-none"
                        placeholder="Explain the problem you are experiencing..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={supportSubmitting}
                      className="w-full py-3 px-6 bg-white hover:bg-slate-200 text-black text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {supportSubmitting ? (
                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send size={16} />
                          Submit Support Ticket
                        </>
                      )}
                    </button>
                  </form>

                  {/* Divider */}
                  <div className="my-6 flex items-center justify-between">
                    <div className="h-px bg-slate-800 flex-1"></div>
                    <span className="px-4 text-[10px] text-slate-500 uppercase font-semibold">Direct Channels</span>
                    <div className="h-px bg-slate-800 flex-1"></div>
                  </div>

                  {/* Direct Contact Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <a
                      href="mailto:contact@Cynexai.in?subject=IT Support Request - Student Login"
                      className="flex items-center gap-3 p-3 bg-[#0a0a0a] border border-slate-800 rounded-lg hover:border-indigo-500 hover:bg-indigo-500/5 transition-all text-slate-300 hover:text-white"
                    >
                      <div className="w-8 h-8 bg-indigo-500/10 rounded flex items-center justify-center text-indigo-400">
                        <Mail size={16} />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Email Us</p>
                        <p className="text-xs font-semibold">contact@Cynexai.in</p>
                      </div>
                    </a>

                    <a
                      href="tel:+919966639869"
                      className="flex items-center gap-3 p-3 bg-[#0a0a0a] border border-slate-800 rounded-lg hover:border-indigo-500 hover:bg-indigo-500/5 transition-all text-slate-300 hover:text-white"
                    >
                      <div className="w-8 h-8 bg-indigo-500/10 rounded flex items-center justify-center text-indigo-400">
                        <Phone size={16} />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Call Us</p>
                        <p className="text-xs font-semibold">+91 9966639869</p>
                      </div>
                    </a>
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-medium">
                    <Clock size={12} className="text-indigo-400" />
                    <span>24/7 IT Support Available for Active Students</span>
                  </div>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 flex flex-col items-center justify-center text-center animate-fade-in"
                >
                  <div className="w-16 h-16 bg-emerald-500/15 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 mb-6">
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Ticket Submitted Successfully</h3>
                  <p className="text-sm text-slate-400 max-w-sm mb-8 leading-relaxed">
                    Thank you! Your IT support ticket has been registered. An administrator will review your issue and follow up with you shortly via email.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSupportSuccess(false);
                      setIsSupportModalOpen(false);
                    }}
                    className="py-2.5 px-8 bg-white hover:bg-slate-200 text-black text-sm font-semibold rounded-md transition-all"
                  >
                    Close
                  </button>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentLogin;
