import { useState, useEffect } from 'react';

export const useTheme = () => {
    const isDarkMode = false;

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }, []);

    const toggleTheme = () => {};

    return { isDarkMode, toggleTheme };
};
