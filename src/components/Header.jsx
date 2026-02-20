import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './Header.css';

function Header({ onMenuToggle, mobileMenuOpen }) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const { currentUser, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const getUserInitials = () => {
        if (currentUser?.displayName) {
            return currentUser.displayName
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
        }
        return currentUser?.email?.charAt(0).toUpperCase() || 'U';
    };

    const getUserName = () => {
        return currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
    };

    return (
        <header className="header">
            <div className="header-left">
                <button
                    className="mobile-menu-btn"
                    onClick={onMenuToggle}
                    aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                >
                    {mobileMenuOpen ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    )}
                </button>
            </div>

            <div className="header-right" ref={dropdownRef}>
                {/* Theme Toggle */}
                <button
                    className="theme-toggle"
                    onClick={toggleTheme}
                    title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    <div className="theme-toggle-icon">
                        {/* Sun — visible in dark mode */}
                        <span className="theme-sun">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="5" />
                                <line x1="12" y1="1" x2="12" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="23" />
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                <line x1="1" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="12" x2="23" y2="12" />
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </svg>
                        </span>
                        {/* Moon — visible in light mode */}
                        <span className="theme-moon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        </span>
                    </div>
                </button>

                <div
                    className="user-menu"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                    <div className="user-avatar">
                        {getUserInitials()}
                    </div>
                    <span className="user-name">{getUserName()}</span>
                    <svg
                        className={`dropdown-arrow ${dropdownOpen ? 'open' : ''}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </div>

                {dropdownOpen && (
                    <div className="dropdown-menu">
                        <div className="dropdown-header">
                            <div className="dropdown-user-avatar">{getUserInitials()}</div>
                            <div className="dropdown-user-info">
                                <span className="dropdown-user-name">{getUserName()}</span>
                                <span className="dropdown-user-email">{currentUser?.email}</span>
                            </div>
                        </div>
                        <div className="dropdown-divider"></div>
                        <button
                            className="dropdown-item"
                            onClick={() => { navigate('/profile'); setDropdownOpen(false); }}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            Profile
                        </button>
                        <button
                            className="dropdown-item"
                            onClick={toggleTheme}
                        >
                            {isDark ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="5" />
                                    <line x1="12" y1="1" x2="12" y2="3" />
                                    <line x1="12" y1="21" x2="12" y2="23" />
                                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                    <line x1="1" y1="12" x2="3" y2="12" />
                                    <line x1="21" y1="12" x2="23" y2="12" />
                                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                                </svg>
                            )}
                            {isDark ? 'Light Mode' : 'Dark Mode'}
                        </button>
                        <button
                            className="dropdown-item dropdown-item-danger"
                            onClick={handleLogout}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                            Sign Out
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}

export default Header;
