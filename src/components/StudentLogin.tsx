import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { client, isTursoConfigured } from '../lib/turso';

const StudentLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isTursoConfigured && client) {
        const result = await client.execute({
          sql: "SELECT * FROM users WHERE email = ? AND password_hash = ? AND role = 'student'",
          args: [email, password]
        });

        if (result.rows.length > 0) {
          const user = result.rows[0];
          localStorage.setItem('cynexai_student_auth', 'true');
          localStorage.setItem('cynexai_student_id', user.id as string);
          localStorage.setItem('cynexai_student_name', user.name as string);
          navigate('/portal');
        } else {
          // Fallback for demo
          if (email === 'student@cynexai.com' && password === 'student123') {
            localStorage.setItem('cynexai_student_auth', 'true');
            localStorage.setItem('cynexai_student_id', 'demo-student-id');
            localStorage.setItem('cynexai_student_name', 'Demo Student');
            navigate('/portal');
          } else {
            setError('Invalid email or password');
          }
        }
      } else {
        // Fallback for demo
        if (email === 'student@cynexai.com' && password === 'student123') {
          localStorage.setItem('cynexai_student_auth', 'true');
          localStorage.setItem('cynexai_student_id', 'demo-student-id');
          localStorage.setItem('cynexai_student_name', 'Demo Student');
          navigate('/portal');
        } else {
          setError('Invalid email or password');
        }
      }
    } catch (err: unknown) {
      setError(`Login failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
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
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-[#0a0a0a] border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md outline-none transition-all text-slate-200 placeholder:text-slate-600 text-sm"
                placeholder="••••••••"
              />
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
          Trouble logging in? <span className="text-indigo-400 cursor-pointer hover:text-indigo-300 transition-colors">Contact IT Support</span>
        </p>
      </motion.div>
    </div>
  );
};

export default StudentLogin;
