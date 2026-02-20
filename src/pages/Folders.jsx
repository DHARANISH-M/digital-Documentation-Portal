import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { createFolder, renameFolder, deleteFolder, updateFolderProtection } from '../services/folders';
import { unfileDocumentsInFolder } from '../services/documents';
import FolderPasswordModal from '../components/FolderPasswordModal';
import './Folders.css';

function Folders() {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isProtected, setIsProtected] = useState(false);
    const [folderPassword, setFolderPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [creating, setCreating] = useState(false);
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [folderToDelete, setFolderToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');

    // Protection settings modal
    const [protectionModalOpen, setProtectionModalOpen] = useState(false);
    const [protectionFolder, setProtectionFolder] = useState(null);
    const [protectionEnabled, setProtectionEnabled] = useState(false);
    const [protectionPassword, setProtectionPassword] = useState('');
    const [protectionConfirm, setProtectionConfirm] = useState('');
    const [showProtectionPassword, setShowProtectionPassword] = useState(false);
    const [updatingProtection, setUpdatingProtection] = useState(false);

    // Password verification modal
    const [passwordModalFolder, setPasswordModalFolder] = useState(null);

    const { currentUser } = useAuth();
    const {
        folders, foldersLoading, loadFolders,
        addFolderToCache, updateFolderInCache, removeFolderFromCache,
        unfileDocumentsInCache,
        grantFolderAccess, hasFolderAccess, getFolderAccessTimeRemaining
    } = useData();
    const navigate = useNavigate();

    useEffect(() => {
        if (currentUser) {
            loadFolders();
        }
    }, [currentUser]);

    // Password strength calculator
    const getPasswordStrength = (pwd) => {
        if (!pwd) return { level: 0, label: '' };
        let score = 0;
        if (pwd.length >= 6) score++;
        if (pwd.length >= 10) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;

        if (score <= 1) return { level: 1, label: 'Weak', className: 'weak' };
        if (score <= 3) return { level: 2, label: 'Medium', className: 'medium' };
        return { level: 3, label: 'Strong', className: 'strong' };
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;

        // Validate password if protection is enabled
        if (isProtected) {
            if (folderPassword.length < 6) {
                setError('Password must be at least 6 characters long.');
                return;
            }
            if (folderPassword !== confirmPassword) {
                setError('Passwords do not match.');
                return;
            }
        }

        setCreating(true);
        setError('');
        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out. Please check your internet connection.')), 15000)
            );
            const folderId = await Promise.race([
                createFolder(newFolderName.trim(), currentUser.uid, isProtected, isProtected ? folderPassword : null),
                timeoutPromise
            ]);
            // Optimistic cache update — add folder locally
            addFolderToCache({
                id: folderId,
                name: newFolderName.trim(),
                userId: currentUser.uid,
                isProtected: isProtected,
                createdAt: { toDate: () => new Date(), toMillis: () => Date.now() }
            });
            // Reset form
            setNewFolderName('');
            setIsProtected(false);
            setFolderPassword('');
            setConfirmPassword('');
            setShowNewPassword(false);
            setShowCreateModal(false);
        } catch (err) {
            console.error('Error creating folder:', err);
            if (err.code === 'permission-denied') {
                setError('Permission denied. Please check Firestore security rules.');
            } else if (err.message?.includes('timed out')) {
                setError('Request timed out. Please check your internet connection and try again.');
            } else {
                setError(`Failed to create folder: ${err.message}`);
            }
        } finally {
            setCreating(false);
        }
    };

    const handleRenameStart = (folder) => {
        setRenamingId(folder.id);
        setRenameValue(folder.name);
    };

    const handleRenameSubmit = async (folderId) => {
        if (!renameValue.trim()) return;
        try {
            await renameFolder(folderId, renameValue.trim());
            // Optimistic cache update
            updateFolderInCache(folderId, { name: renameValue.trim() });
            setRenamingId(null);
            setRenameValue('');
        } catch (error) {
            console.error('Error renaming folder:', error);
        }
    };

    const handleDeleteClick = (folder) => {
        setFolderToDelete(folder);
        setDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!folderToDelete) return;
        setDeleting(true);
        try {
            await unfileDocumentsInFolder(folderToDelete.id);
            await deleteFolder(folderToDelete.id);
            // Optimistic cache updates
            unfileDocumentsInCache(folderToDelete.id);
            removeFolderFromCache(folderToDelete.id);
            setDeleteModalOpen(false);
            setFolderToDelete(null);
        } catch (error) {
            console.error('Error deleting folder:', error);
        } finally {
            setDeleting(false);
        }
    };

    const handleOpenFolder = (folder) => {
        // If folder is protected and no active access session, show password modal
        if (folder.isProtected && !hasFolderAccess(folder.id)) {
            setPasswordModalFolder(folder);
            return;
        }
        navigate(`/documents?folder=${folder.id}&folderName=${encodeURIComponent(folder.name)}`);
    };

    const handlePasswordSuccess = (folder) => {
        grantFolderAccess(folder.id);
        setPasswordModalFolder(null);
        navigate(`/documents?folder=${folder.id}&folderName=${encodeURIComponent(folder.name)}`);
    };

    // Protection settings modal handlers
    const handleProtectionClick = (folder) => {
        setProtectionFolder(folder);
        setProtectionEnabled(folder.isProtected || false);
        setProtectionPassword('');
        setProtectionConfirm('');
        setShowProtectionPassword(false);
        setProtectionModalOpen(true);
        setError('');
    };

    const handleProtectionSubmit = async (e) => {
        e.preventDefault();
        if (!protectionFolder) return;

        // Validate if enabling protection
        if (protectionEnabled) {
            if (protectionPassword.length < 6) {
                setError('Password must be at least 6 characters long.');
                return;
            }
            if (protectionPassword !== protectionConfirm) {
                setError('Passwords do not match.');
                return;
            }
        }

        setUpdatingProtection(true);
        setError('');
        try {
            await updateFolderProtection(
                protectionFolder.id,
                protectionEnabled,
                protectionEnabled ? protectionPassword : null
            );
            updateFolderInCache(protectionFolder.id, { isProtected: protectionEnabled });
            setProtectionModalOpen(false);
            setProtectionFolder(null);
        } catch (err) {
            console.error('Error updating protection:', err);
            setError(`Failed to update protection: ${err.message}`);
        } finally {
            setUpdatingProtection(false);
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const passwordStrength = getPasswordStrength(isProtected ? folderPassword : protectionPassword);

    return (
        <div className="folders-page fade-in">
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">Folders</h1>
                        <p className="page-subtitle">Organize your documents into folders</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        New Folder
                    </button>
                </div>
            </div>

            {foldersLoading && !folders.length ? (
                <div className="folders-loading">
                    <div className="spinner"></div>
                    <p>Loading folders...</p>
                </div>
            ) : folders.length > 0 ? (
                <div className="folders-grid">
                    {folders.map(folder => (
                        <div className={`folder-card card card-hover ${folder.isProtected ? 'folder-card-protected' : ''}`} key={folder.id}>
                            <div className="folder-card-header">
                                <div className={`folder-icon ${folder.isProtected ? 'folder-icon-protected' : ''}`}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                    </svg>
                                    {folder.isProtected && (
                                        <div className="folder-lock-overlay">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div className="folder-info">
                                    {renamingId === folder.id ? (
                                        <form
                                            className="rename-form"
                                            onSubmit={(e) => { e.preventDefault(); handleRenameSubmit(folder.id); }}
                                        >
                                            <input
                                                className="rename-input"
                                                value={renameValue}
                                                onChange={(e) => setRenameValue(e.target.value)}
                                                autoFocus
                                                onBlur={() => setRenamingId(null)}
                                                onKeyDown={(e) => e.key === 'Escape' && setRenamingId(null)}
                                            />
                                        </form>
                                    ) : (
                                        <h3 className="folder-name" onClick={() => handleOpenFolder(folder)}>
                                            {folder.name}
                                        </h3>
                                    )}
                                    <div className="folder-meta-row">
                                        <span className="folder-meta">
                                            Created {formatDate(folder.createdAt)}
                                        </span>
                                        {folder.isProtected && (
                                            hasFolderAccess(folder.id) ? (
                                                <span className="folder-session-badge">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                                    </svg>
                                                    {getFolderAccessTimeRemaining(folder.id)}m access
                                                </span>
                                            ) : (
                                                <span className="folder-protected-badge">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                                    </svg>
                                                    Protected
                                                </span>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="folder-actions">
                                <button className="btn-icon" title="Open" onClick={() => handleOpenFolder(folder)}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v1M5 19h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2z" />
                                    </svg>
                                </button>
                                <button className="btn-icon" title="Protection Settings" onClick={() => handleProtectionClick(folder)}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    </svg>
                                </button>
                                <button className="btn-icon" title="Rename" onClick={() => handleRenameStart(folder)}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                </button>
                                <button className="btn-icon btn-icon-danger" title="Delete" onClick={() => handleDeleteClick(folder)}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="folders-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    <h3>No folders yet</h3>
                    <p>Create your first folder to start organizing documents</p>
                    <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                        Create Folder
                    </button>
                </div>
            )}

            {/* Error Banner */}
            {error && !showCreateModal && !protectionModalOpen && (
                <div className="error-banner" style={{
                    background: '#fee2e2',
                    color: '#991b1b',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.9rem',
                    border: '1px solid #fecaca'
                }}>
                    <span>{error}</span>
                    <button
                        onClick={() => setError('')}
                        style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.25rem' }}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Create Folder Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => { if (!creating) { setShowCreateModal(false); setError(''); setIsProtected(false); setFolderPassword(''); setConfirmPassword(''); } }}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3 className="modal-title">Create New Folder</h3>
                        {error && (
                            <div style={{
                                background: '#fee2e2',
                                color: '#991b1b',
                                padding: '0.6rem 0.8rem',
                                borderRadius: '6px',
                                marginBottom: '1rem',
                                fontSize: '0.85rem',
                                border: '1px solid #fecaca'
                            }}>
                                {error}
                            </div>
                        )}
                        <form onSubmit={handleCreate}>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label" htmlFor="folderName">Folder Name</label>
                                <input
                                    id="folderName"
                                    className="form-input"
                                    type="text"
                                    placeholder="e.g., Financial Reports 2026"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    autoFocus
                                    required
                                />
                            </div>

                            {/* Protection Toggle */}
                            <div className={`protection-toggle ${isProtected ? 'active' : ''}`}>
                                <div className="protection-toggle-label">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    </svg>
                                    <div>
                                        <div className="protection-toggle-text">Password Protection</div>
                                        <div className="protection-toggle-desc">Require password to access this folder</div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className={`toggle-switch ${isProtected ? 'active' : ''}`}
                                    onClick={() => {
                                        setIsProtected(!isProtected);
                                        if (isProtected) {
                                            setFolderPassword('');
                                            setConfirmPassword('');
                                        }
                                        setError('');
                                    }}
                                    aria-label="Toggle password protection"
                                />
                            </div>

                            {/* Password fields (shown when protection is enabled) */}
                            {isProtected && (
                                <div className="protection-password-section" style={{ animation: 'slideDown 0.25s ease-out' }}>
                                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                                        <label className="form-label" htmlFor="folderPassword">Folder Password</label>
                                        <div className="password-input-group">
                                            <input
                                                id="folderPassword"
                                                type={showNewPassword ? 'text' : 'password'}
                                                className="form-input"
                                                style={{ paddingRight: '48px' }}
                                                placeholder="Minimum 6 characters"
                                                value={folderPassword}
                                                onChange={(e) => setFolderPassword(e.target.value)}
                                                minLength={6}
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="password-toggle-btn"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                tabIndex={-1}
                                            >
                                                {showNewPassword ? (
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
                                        {/* Password strength indicator */}
                                        {folderPassword && (
                                            <>
                                                <div className="password-strength">
                                                    {[1, 2, 3].map(i => (
                                                        <div
                                                            key={i}
                                                            className={`password-strength-bar ${i <= passwordStrength.level ? passwordStrength.className : ''}`}
                                                        />
                                                    ))}
                                                </div>
                                                <div className={`password-strength-text ${passwordStrength.className}`}>
                                                    {passwordStrength.label}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                        <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
                                        <input
                                            id="confirmPassword"
                                            type={showNewPassword ? 'text' : 'password'}
                                            className={`form-input ${confirmPassword && confirmPassword !== folderPassword ? 'form-input-error' : ''}`}
                                            placeholder="Re-enter password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                        />
                                        {confirmPassword && confirmPassword !== folderPassword && (
                                            <div className="form-error">Passwords do not match</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => { setShowCreateModal(false); setError(''); setIsProtected(false); setFolderPassword(''); setConfirmPassword(''); }}
                                    disabled={creating}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={creating || !newFolderName.trim() || (isProtected && (folderPassword.length < 6 || folderPassword !== confirmPassword))}
                                >
                                    {creating ? 'Creating...' : (
                                        <>
                                            {isProtected && (
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                                </svg>
                                            )}
                                            Create{isProtected ? ' Protected Folder' : ''}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Protection Settings Modal */}
            {protectionModalOpen && protectionFolder && (
                <div className="modal-overlay" onClick={() => !updatingProtection && setProtectionModalOpen(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3 className="modal-title">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '8px', color: 'var(--accent-purple)' }}>
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            Protection Settings
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: '1.2rem' }}>
                            Configure password protection for "{protectionFolder.name}"
                        </p>
                        {error && (
                            <div style={{
                                background: '#fee2e2',
                                color: '#991b1b',
                                padding: '0.6rem 0.8rem',
                                borderRadius: '6px',
                                marginBottom: '1rem',
                                fontSize: '0.85rem',
                                border: '1px solid #fecaca'
                            }}>
                                {error}
                            </div>
                        )}
                        <form onSubmit={handleProtectionSubmit}>
                            <div className={`protection-toggle ${protectionEnabled ? 'active' : ''}`}>
                                <div className="protection-toggle-label">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                    <div>
                                        <div className="protection-toggle-text">
                                            {protectionEnabled ? 'Protection Enabled' : 'Protection Disabled'}
                                        </div>
                                        <div className="protection-toggle-desc">
                                            {protectionEnabled ? 'Password required to access' : 'Anyone with access can open'}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className={`toggle-switch ${protectionEnabled ? 'active' : ''}`}
                                    onClick={() => {
                                        setProtectionEnabled(!protectionEnabled);
                                        setProtectionPassword('');
                                        setProtectionConfirm('');
                                        setError('');
                                    }}
                                    aria-label="Toggle password protection"
                                />
                            </div>

                            {protectionEnabled && (
                                <div style={{ animation: 'slideDown 0.25s ease-out' }}>
                                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                                        <label className="form-label" htmlFor="protectionPwd">
                                            {protectionFolder.isProtected ? 'New Password' : 'Set Password'}
                                        </label>
                                        <div className="password-input-group">
                                            <input
                                                id="protectionPwd"
                                                type={showProtectionPassword ? 'text' : 'password'}
                                                className="form-input"
                                                style={{ paddingRight: '48px' }}
                                                placeholder="Minimum 6 characters"
                                                value={protectionPassword}
                                                onChange={(e) => setProtectionPassword(e.target.value)}
                                                minLength={6}
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="password-toggle-btn"
                                                onClick={() => setShowProtectionPassword(!showProtectionPassword)}
                                                tabIndex={-1}
                                            >
                                                {showProtectionPassword ? (
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
                                        {protectionPassword && (
                                            <>
                                                <div className="password-strength">
                                                    {[1, 2, 3].map(i => (
                                                        <div
                                                            key={i}
                                                            className={`password-strength-bar ${i <= getPasswordStrength(protectionPassword).level ? getPasswordStrength(protectionPassword).className : ''}`}
                                                        />
                                                    ))}
                                                </div>
                                                <div className={`password-strength-text ${getPasswordStrength(protectionPassword).className}`}>
                                                    {getPasswordStrength(protectionPassword).label}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                                        <label className="form-label" htmlFor="protectionConfirm">Confirm Password</label>
                                        <input
                                            id="protectionConfirm"
                                            type={showProtectionPassword ? 'text' : 'password'}
                                            className={`form-input ${protectionConfirm && protectionConfirm !== protectionPassword ? 'form-input-error' : ''}`}
                                            placeholder="Re-enter password"
                                            value={protectionConfirm}
                                            onChange={(e) => setProtectionConfirm(e.target.value)}
                                            required
                                        />
                                        {protectionConfirm && protectionConfirm !== protectionPassword && (
                                            <div className="form-error">Passwords do not match</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => { setProtectionModalOpen(false); setError(''); }}
                                    disabled={updatingProtection}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={
                                        updatingProtection ||
                                        (protectionEnabled && (protectionPassword.length < 6 || protectionPassword !== protectionConfirm))
                                    }
                                >
                                    {updatingProtection ? 'Saving...' : 'Save Settings'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && (
                <div className="modal-overlay" onClick={() => !deleting && setDeleteModalOpen(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3 className="modal-title">Delete Folder</h3>
                        <p className="modal-text">
                            Are you sure you want to delete "{folderToDelete?.name}"? Documents inside will become unfiled but won't be deleted.
                        </p>
                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setDeleteModalOpen(false)}
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleDeleteConfirm}
                                disabled={deleting}
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Verification Modal */}
            {passwordModalFolder && (
                <FolderPasswordModal
                    folder={passwordModalFolder}
                    onSuccess={handlePasswordSuccess}
                    onClose={() => setPasswordModalFolder(null)}
                />
            )}
        </div>
    );
}

export default Folders;
