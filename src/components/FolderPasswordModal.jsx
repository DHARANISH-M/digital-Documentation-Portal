import { useState, useEffect, useRef } from 'react';
import { verifyFolderPassword } from '../services/folders';
import './FolderPasswordModal.css';

const MAX_ATTEMPTS = 5;

/**
 * FolderPasswordModal — Premium password verification modal
 * 
 * Props:
 *  - folder: { id, name, isProtected } — the folder to unlock
 *  - onSuccess: (folder) => void — called when password is verified
 *  - onClose: () => void — called when modal is dismissed
 */
function FolderPasswordModal({ folder, onSuccess, onClose }) {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [lockedOut, setLockedOut] = useState(false);
    const [success, setSuccess] = useState(false);
    const [shake, setShake] = useState(false);

    const inputRef = useRef(null);

    // Auto-focus password input on mount
    useEffect(() => {
        if (inputRef.current && !lockedOut && !success) {
            inputRef.current.focus();
        }
    }, [lockedOut, success]);

    // Check lockout on attempts change
    useEffect(() => {
        if (attempts >= MAX_ATTEMPTS) {
            setLockedOut(true);
            setError('');
        }
    }, [attempts]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!password.trim()) {
            setError('Please enter the folder password.');
            return;
        }

        if (lockedOut) return;

        setVerifying(true);
        setError('');

        try {
            const result = await verifyFolderPassword(folder.id, password);

            if (result.success) {
                setSuccess(true);
                // Small delay to show success animation before proceeding
                setTimeout(() => {
                    onSuccess(folder);
                }, 800);
            } else {
                const newAttempts = attempts + 1;
                setAttempts(newAttempts);
                setError(result.message);
                setPassword('');
                // Trigger shake animation
                setShake(true);
                setTimeout(() => setShake(false), 500);

                if (newAttempts >= MAX_ATTEMPTS) {
                    setLockedOut(true);
                }
            }
        } catch (err) {
            console.error('Password verification error:', err);
            setError('An error occurred. Please try again.');
        } finally {
            setVerifying(false);
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && !verifying && !success) {
            onClose();
        }
    };

    // Success state
    if (success) {
        return (
            <div className="password-modal-overlay" onClick={handleOverlayClick}>
                <div className="password-modal" onClick={e => e.stopPropagation()}>
                    <div className="password-success">
                        <div className="password-success-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                        <h4>Access Granted</h4>
                        <p>Opening "{folder.name}"...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Locked out state
    if (lockedOut) {
        return (
            <div className="password-modal-overlay" onClick={handleOverlayClick}>
                <div className="password-modal" onClick={e => e.stopPropagation()}>
                    <button className="password-modal-close" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                    <div className="password-lockout">
                        <div className="password-lockout-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                        </div>
                        <h4>Too Many Attempts</h4>
                        <p>
                            You've exceeded the maximum number of password attempts ({MAX_ATTEMPTS}).
                            Please close this modal and try again later.
                        </p>
                    </div>
                    <div className="password-modal-actions">
                        <button className="btn btn-secondary" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Normal password input state
    return (
        <div className="password-modal-overlay" onClick={handleOverlayClick}>
            <div className="password-modal" onClick={e => e.stopPropagation()}>
                <button className="password-modal-close" onClick={onClose}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                <div className={`password-modal-icon ${shake ? 'shake' : ''}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                </div>

                <h3 className="password-modal-title">Protected Folder</h3>
                <p className="password-modal-subtitle">
                    Enter the password to access{' '}
                    <span className="password-modal-folder-name">"{folder.name}"</span>
                </p>

                {error && (
                    <div className="password-error">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="password-input-group">
                        <input
                            ref={inputRef}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter folder password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={error ? 'input-error' : ''}
                            disabled={verifying}
                            autoComplete="off"
                        />
                        <button
                            type="button"
                            className="password-toggle-btn"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex={-1}
                        >
                            {showPassword ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                    <line x1="1" y1="1" x2="23" y2="23" />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                            )}
                        </button>
                    </div>

                    {attempts > 0 && (
                        <p className="password-attempts">
                            <strong>{MAX_ATTEMPTS - attempts}</strong> attempts remaining
                        </p>
                    )}

                    <div className="password-modal-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={verifying}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={verifying || !password.trim()}
                        >
                            {verifying ? (
                                <>
                                    <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                    Unlock
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default FolderPasswordModal;
