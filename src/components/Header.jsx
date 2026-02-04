import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Header.css';

function Header() {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const { currentUser, logout } = useAuth();
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
                {/* Mobile menu button could go here */}
            </div>

            <div className="header-right" ref={dropdownRef}>
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
