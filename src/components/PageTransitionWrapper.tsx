import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const PageTransitionWrapper = ({ children }: { children: React.ReactNode }) => {
    const location = useLocation();

    return (
        <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
        >
            {children}
        </motion.div>
    );
};

export default PageTransitionWrapper;
