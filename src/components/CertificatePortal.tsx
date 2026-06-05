import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Lock, LogIn, Key, Download, FileText, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { verifyCertificateLogin, getCertificatesByCredential, Certificate } from '../lib/turso';
import Header from './Header';
import Footer from './Footer';

export const CertificatePortal = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [credentialId, setCredentialId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [certificates, setCertificates] = useState<Certificate[]>([]);

  // Check if session exists in sessionStorage
  useEffect(() => {
    const savedSession = sessionStorage.getItem('cynex_cert_portal_auth');
    if (savedSession) {
      const data = JSON.parse(savedSession);
      setCredentialId(data.id);
      setStudentName(data.name);
      setIsLoggedIn(true);
      fetchCertificates(data.id);
    }
  }, []);

  const fetchCertificates = async (id: string) => {
    try {
      const certs = await getCertificatesByCredential(id);
      setCertificates(certs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cred = await verifyCertificateLogin(username, password);
      if (cred) {
        setCredentialId(cred.id);
        setStudentName(cred.student_name);
        setIsLoggedIn(true);
        sessionStorage.setItem('cynex_cert_portal_auth', JSON.stringify({ id: cred.id, name: cred.student_name }));
        await fetchCertificates(cred.id);
      } else {
        setError('Invalid username or password.');
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('cynex_cert_portal_auth');
    setIsLoggedIn(false);
    setCredentialId('');
    setStudentName('');
    setCertificates([]);
    setUsername('');
    setPassword('');
  };

  const handleDownload = (cert: Certificate) => {
    if (cert.file_data) {
      const link = document.createElement('a');
      link.href = cert.file_data;
      // Extract extension from mime type or default to pdf
      let ext = 'pdf';
      if (cert.file_type?.includes('png')) ext = 'png';
      if (cert.file_type?.includes('jpeg')) ext = 'jpg';
      
      link.download = `CynexAI_Certificate_${cert.course_title.replace(/\s+/g, '_')}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col font-sans">
      <Header />

      <main className="flex-1 flex flex-col pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col">
          
          {/* Header Section */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center p-3.5 bg-indigo-500/10 rounded-md border border-indigo-500/20 mb-5">
              <Award className="w-10 h-10 text-indigo-400" />
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold mb-3 tracking-tight text-white">
              CynexAI <span className="text-indigo-400">Credentials Portal</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Securely access, verify, and download your official academic certificates and credentials.
            </p>
          </div>

          {!isLoggedIn ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md mx-auto w-full bg-[#0f172a] border border-slate-800 rounded-lg p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-800">
                  <Lock className="text-indigo-400 w-5 h-5" />
                  <h2 className="text-lg font-semibold text-white tracking-tight">Portal Authentication</h2>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm text-center font-medium">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Portal Username / Email</label>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Provided by Admin"
                          className="w-full bg-[#0a0a0a] border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md py-2.5 pl-11 pr-4 text-slate-200 placeholder:text-slate-600 text-sm outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Secure Pin / Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#0a0a0a] border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md py-2.5 pl-11 pr-10 text-slate-200 placeholder:text-slate-600 text-sm outline-none transition-all"
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
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-6 bg-white hover:bg-slate-200 text-black text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-4"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <LogIn size={16} /> Access My Credentials
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-4xl mx-auto"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                  <p className="text-[#41c8df] font-mono text-sm mb-1">Authenticated Session</p>
                  <h2 className="text-2xl font-bold">Welcome back, {studentName}</h2>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm font-bold transition-all"
                >
                  Log Out
                </button>
              </div>

              <div className="bg-gray-800/30 border border-gray-700/50 rounded-3xl p-6 sm:p-10">
                <div className="flex items-center gap-3 mb-8">
                  <FileText className="text-[#41c8df]" />
                  <h3 className="text-xl font-bold">Your Certificates</h3>
                </div>

                {certificates.length === 0 ? (
                  <div className="text-center py-16 bg-gray-900/50 rounded-2xl border border-gray-800">
                    <Award className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                    <h4 className="text-lg font-bold text-gray-300">No Certificates Found</h4>
                    <p className="text-gray-500 max-w-md mx-auto mt-2">
                      Your credentials have not been uploaded to this portal yet. Please contact your instructor if you believe this is an error.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {certificates.map((cert) => (
                      <div key={cert.id} className="bg-gray-900/80 border border-gray-700 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-[#41c8df]/50 transition-colors">
                        
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#41c8df]/5 rounded-bl-full -z-10 group-hover:bg-[#41c8df]/10 transition-colors" />

                        <div>
                          <div className="flex items-start justify-between mb-4">
                            <div className="p-2 bg-[#41c8df]/10 text-[#41c8df] rounded-xl">
                              <Award size={24} />
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-md">
                              <CheckCircle2 size={12} /> Verified
                            </div>
                          </div>

                          <h4 className="font-bold text-lg mb-1 leading-tight">{cert.course_title}</h4>
                          <p className="text-xs text-gray-400 font-mono mb-4">ID: {cert.certificate_number}</p>
                          
                          <div className="space-y-1 mb-8">
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Issued On</p>
                            <p className="text-sm font-bold text-gray-300">
                              {new Date(cert.issued_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        {cert.file_data ? (
                          <button
                            onClick={() => handleDownload(cert)}
                            className="w-full py-3 bg-[#41c8df] hover:bg-[#2bb5cc] text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#41c8df]/20"
                          >
                            <Download size={18} /> Download Certificate
                          </button>
                        ) : (
                          <button
                            disabled
                            className="w-full py-3 bg-gray-800 text-gray-500 font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
                          >
                            PDF Not Attached
                          </button>
                        )}

                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
};
