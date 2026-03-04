import { useEffect } from 'react';

export const useTheme = () => {
    // Always force dark mode for the entire website
    const isDarkMode = true;

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }, []);

    // Provide a dummy toggle that does nothing, or just keep it so we don't break existing imports
    const toggleTheme = () => {
        console.log("Theme is locked to dark mode.");
    };

    return { isDarkMode, toggleTheme };
};
