import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../services/admin';
import './Sidebar.css';

function Sidebar({ mobileOpen, onClose }) {
    const { currentUser } = useAuth();
    const userIsAdmin = isAdmin(currentUser?.email);

    const menuItems = [
        { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
        { path: '/upload', icon: 'upload', label: 'Upload Document' },
        { path: '/documents', icon: 'documents', label: 'View Documents' },
        { path: '/folders', icon: 'folders', label: 'Folders' },
        { path: '/search', icon: 'search', label: 'Search & Filter' },
        { path: '/help', icon: 'help', label: 'Help & Support' },
        { path: '/profile', icon: 'profile', label: 'Profile' }
    ];

    // Add admin link if user is admin
    if (userIsAdmin) {
        menuItems.splice(5, 0, { path: '/admin', icon: 'admin', label: 'Admin Panel' });
    }

    const getIcon = (iconName) => {
        switch (iconName) {
            case 'dashboard':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                );
            case 'upload':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                );
            case 'documents':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                    </svg>
                );
            case 'folders':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                );
            case 'search':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                );
            case 'help':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                );
            case 'admin':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                );
            case 'profile':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <aside className={`sidebar ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
            {/* Close button for mobile */}
            <button className="sidebar-close" onClick={onClose} aria-label="Close menu">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>

            <div className="sidebar-logo">
                <div className="logo-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                </div>
                <span className="logo-text">Digital Docs</span>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `nav-item ${isActive ? 'nav-item-active' : ''}`
                        }
                        onClick={onClose}
                    >
                        <span className="nav-icon">{getIcon(item.icon)}</span>
                        <span className="nav-label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}

export default Sidebar;
