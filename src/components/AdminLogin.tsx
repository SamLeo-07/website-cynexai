import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface AdminLoginProps {
    onLogin: (password: string) => void;
    error?: string | null;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, error }) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const isMounted = React.useRef(true);
    React.useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Simulate a brief loading state for better UX
        setTimeout(() => {
            if (isMounted.current) {
                onLogin(password);
            }
            if (isMounted.current) {
                setLoading(false);
            }
        }, 600);
    };

    return (
        <div className="min-h-screen bg-transparent flex items-center justify-center p-4 selection:bg-[#41c8df]/30 relative z-10">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#41c8df]/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#41c8df]/5 rounded-full blur-[120px] animate-pulse animation-delay-2000" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Logo/Icon Section */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
                        className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-[#41c8df] to-[#2a8fab] p-0.5 mb-6 shadow-2xl shadow-[#41c8df]/20"
                    >
                        <div className="w-full h-full bg-background rounded-[22px] flex items-center justify-center">
                            <ShieldCheck className="w-10 h-10 text-[#41c8df]" />
                        </div>
                    </motion.div>
                    <h1 className="text-3xl font-display font-bold text-secondary mb-2">Admin Portal</h1>
                    <p className="text-gray-400 font-medium">Authenticating CynexAI Infrastructure</p>
                </div>

                {/* Login Card */}
                <div className="bg-background/40 backdrop-blur-xl border border-secondary/10 p-8 rounded-[2.5rem] shadow-[0_0_50px_rgba(65,200,223,0.15)] relative overflow-hidden group">
                    {/* Progress Bar (Loading State) */}
                    <AnimatePresence>
                        {loading && (
                            <motion.div
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#41c8df] to-transparent origin-left"
                            />
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="password" className="block text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-3 ml-1">
                                Security Password
                            </label>
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#41c8df] transition-colors">
                                    <Lock size={20} />
                                </div>
                                <input
                                    id="password"
                                    required
                                    autoFocus
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    aria-label="Security Password"
                                    className="w-full pl-14 pr-14 py-5 bg-secondary/5 border-2 border-transparent focus:bg-secondary/10 focus:border-[#41c8df]/50 rounded-2xl outline-none transition-all text-secondary font-mono placeholder:text-gray-700"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    title={showPassword ? "Hide password" : "Show password"}
                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-secondary transition-colors p-1"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, y: -10 }}
                                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                                    exit={{ opacity: 0, height: 0, y: -10 }}
                                    className="flex items-center gap-2 text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20"
                                >
                                    <AlertCircle size={18} className="shrink-0" />
                                    <p className="text-sm font-bold tracking-tight">{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 bg-secondary hover:bg-[#41c8df] text-black font-black uppercase tracking-[0.2em] text-sm rounded-2xl transition-all shadow-xl hover:shadow-[#41c8df]/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            <div className="flex items-center justify-center gap-3">
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Unlock Console
                                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </div>
                        </button>
                    </form>
                </div>

                {/* Footer info */}
                <p className="text-center mt-8 text-gray-600 text-xs font-bold uppercase tracking-widest leading-relaxed">
                    Authorized personnel only. All access attempts are <br />
                    logged and monitored by CynexAI Security.
                </p>
            </motion.div>
        </div>
    );
};

export default AdminLogin;
