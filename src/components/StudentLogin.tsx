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
        className="w-full max-w-md bg-background/40 backdrop-blur-2xl border border-[#41c8df]/20 rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(65,200,223,0.15)]"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#41c8df]/10 rounded-2xl flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8 text-[#41c8df]" />
          </div>
          <h2 className="text-2xl font-display font-bold text-secondary text-center">Student Portal</h2>
          <p className="text-gray-400 mt-2 text-sm text-center">Access your courses and dashboard</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none transition-all text-secondary"
                placeholder="student@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none transition-all text-secondary"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 bg-[#41c8df] hover:bg-[#38b2c7] text-black font-bold rounded-xl transition-all flex items-center justify-center group disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Sign In
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Trouble logging in? <span className="text-[#41c8df] cursor-pointer hover:underline">Contact Support</span>
        </p>
      </motion.div>
    </div>
  );
};

export default StudentLogin;
