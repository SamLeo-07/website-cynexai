import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Laptop, Sparkles, GraduationCap, ArrowRight } from 'lucide-react';


const PromotionalPopup = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // TEMPORARILY DISABLED LOCALSTORAGE FOR TESTING
        // Show after a very short delay
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 500); // reduced from 2500ms to 500ms for quicker feedback

        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        // localStorage.setItem('cynexai_promo_popup_seen', new Date().getTime().toString());
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/70 backdrop-blur-md"
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 30, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.95, y: -20, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-background/80 backdrop-blur-2xl p-0 max-w-4xl w-[95%] shadow-[0_0_50px_rgba(65,200,223,0.15)] relative overflow-hidden group border border-secondary/10 flex flex-col md:flex-row rounded-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Animated Edge Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#41c8df] via-purple-500 to-[#41c8df] opacity-10 group-hover:opacity-30 transition-opacity duration-700 blur-2xl z-0"></div>

                        {/* Close Button - Now absolute over the whole card */}
                        <button
                            onClick={handleClose}
                            className="absolute top-3 right-3 p-1.5 rounded-full bg-background/60 hover:bg-secondary/20 text-secondary backdrop-blur-md transition-all z-50 border border-secondary/10"
                            aria-label="Close promotion"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Promotional Image Area (Left Side on Desktop, Top on Mobile) */}
                        <div className="relative w-full md:w-2/5 h-48 md:h-auto bg-gradient-to-br from-gray-900 via-[#1a1b2e] to-black overflow-hidden flex items-center justify-center border-b md:border-b-0 md:border-r border-secondary/10 z-10 shrink-0">
                            {/* Decorative background glow inside the image area */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#41c8df]/10 rounded-full blur-[2xl] z-0 pointer-events-none"></div>

                            {/* High Quality Stock Image of a Premium Laptop */}
                            <img
                                src="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                                alt="Premium Free Laptop"
                                className="w-full h-full object-cover opacity-60 mix-blend-luminosity z-0"
                            />

                            {/* Floating Laptop Graphic Overlay */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                                className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none bg-black/30 backdrop-blur-[2px]"
                            >
                                <div className="relative transform md:scale-110">
                                    <Laptop className="w-16 h-16 md:w-20 md:h-20 text-secondary drop-shadow-[0_0_15px_rgba(65,200,223,0.8)]" />
                                    <motion.div
                                        animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                                        transition={{ duration: 3, repeat: Infinity }}
                                        className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-1 shadow-[0_0_10px_rgba(250,204,21,0.6)]"
                                    >
                                        <Sparkles className="w-4 h-4 text-yellow-900" />
                                    </motion.div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Content Area (Right Side on Desktop, Bottom on Mobile) */}
                        <div className="relative w-full md:w-3/5 p-6 md:p-8 flex flex-col justify-center bg-background/40 z-10 text-center md:text-left">
                            <div className="inline-flex items-center justify-center md:justify-start space-x-2 mb-3">
                                <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-purple-900/40 text-purple-300 text-[10px] md:text-xs font-bold tracking-widest uppercase border border-purple-700/30">
                                    <GraduationCap className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 md:mr-1.5" />
                                    Limited Time Offer
                                </span>
                                <div className="inline-flex items-center space-x-1.5 text-[10px] md:text-xs text-red-400 font-semibold bg-red-900/10 px-3 py-1 rounded-full border border-red-900/20">
                                    <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                    <span>Few slots left</span>
                                </div>
                            </div>

                            <h2 className="text-xl md:text-3xl font-extrabold text-secondary tracking-tight mb-2 md:mb-3">
                                Get a <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#41c8df] to-blue-400 drop-shadow-[0_0_10px_rgba(65,200,223,0.3)]">FREE Laptop</span>
                            </h2>

                            <p className="text-gray-300 text-sm md:text-base leading-relaxed font-medium mb-5 md:mb-6 max-w-md mx-auto md:mx-0">
                                Enroll in any premium course today and receive a brand new laptop to accelerate your tech journey with Cynex AI.
                            </p>

                            {/* Call to Action */}
                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                <button
                                    onClick={() => {
                                        handleClose();
                                        const coursesSection = document.getElementById('courses');
                                        if (coursesSection) {
                                            coursesSection.scrollIntoView({ behavior: 'smooth' });
                                        }
                                    }}
                                    className="w-full sm:w-auto relative group overflow-hidden rounded-lg bg-[#41c8df]/10 px-5 py-3 text-[#41c8df] font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] border border-[#41c8df]/30 hover:border-[#41c8df]/60 hover:bg-[#41c8df]/20"
                                >
                                    <span className="relative flex items-center justify-center z-10 transition-colors duration-300 uppercase tracking-wider text-xs md:text-sm">
                                        Claim Offer Now
                                        <ArrowRight className="ml-2 w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="w-full sm:w-auto px-5 py-3 text-xs md:text-sm font-semibold text-gray-500 hover:text-gray-300 transition-colors"
                                >
                                    No thanks
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PromotionalPopup;
