import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const ThemeToggle = () => {
    const { isDarkMode, toggleTheme } = useTheme();

    return (
        <motion.button
            onClick={toggleTheme}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="fixed bottom-4 right-4 z-50 p-3 rounded-full bg-primary text-secondary shadow-lg hover:bg-yellow-400 hover:text-black transition-colors duration-300 flex items-center justify-center"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Theme"
        >
            {isDarkMode ? (
                <Sun className="w-6 h-6" />
            ) : (
                <Moon className="w-6 h-6" />
            )}
        </motion.button>
    );
};

export default ThemeToggle;
