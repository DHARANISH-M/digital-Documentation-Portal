import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import CursorEffect from './CursorEffect';
import './Layout.css';

function Layout() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => setMobileMenuOpen(prev => !prev);
    const closeMobileMenu = () => setMobileMenuOpen(false);

    return (
        <div className="app-layout">
            <CursorEffect />
            <Sidebar mobileOpen={mobileMenuOpen} onClose={closeMobileMenu} />
            <Header onMenuToggle={toggleMobileMenu} mobileMenuOpen={mobileMenuOpen} />
            {/* Overlay behind sidebar on mobile */}
            {mobileMenuOpen && (
                <div className="mobile-overlay" onClick={closeMobileMenu} />
            )}
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}

export default Layout;
