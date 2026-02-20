import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        // Check localStorage first
        const saved = localStorage.getItem('docportal-theme');
        if (saved === 'dark' || saved === 'light') return saved;
        // Fall back to system preference
        if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });

    useEffect(() => {
        // Apply theme to document root
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);
        localStorage.setItem('docportal-theme', theme);

        // Update meta theme-color for mobile browsers
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.content = theme === 'dark' ? '#0f1117' : '#ffffff';
        }
    }, [theme]);

    // Listen to system preference changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
            // Only auto-follow system if user hasn't manually chosen
            const saved = localStorage.getItem('docportal-theme');
            if (!saved) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const isDark = theme === 'dark';

    const value = {
        theme,
        isDark,
        toggleTheme,
        setTheme
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}
