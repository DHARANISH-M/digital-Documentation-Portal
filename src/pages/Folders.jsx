import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { createFolder, renameFolder, deleteFolder } from '../services/folders';
import { unfileDocumentsInFolder } from '../services/documents';
import './Folders.css';

function Folders() {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [creating, setCreating] = useState(false);
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [folderToDelete, setFolderToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');

    const { currentUser } = useAuth();
    const {
        folders, foldersLoading, loadFolders,
        addFolderToCache, updateFolderInCache, removeFolderFromCache,
        unfileDocumentsInCache
    } = useData();
    const navigate = useNavigate();

    useEffect(() => {
        if (currentUser) {
            loadFolders();
        }
    }, [currentUser]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        setCreating(true);
        setError('');
        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out. Please check your internet connection.')), 15000)
            );
            const folderId = await Promise.race([
                createFolder(newFolderName.trim(), currentUser.uid),
                timeoutPromise
            ]);
            // Optimistic cache update — add folder locally
            addFolderToCache({
                id: folderId,
                name: newFolderName.trim(),
                userId: currentUser.uid,
                createdAt: { toDate: () => new Date(), toMillis: () => Date.now() }
            });
            setNewFolderName('');
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
        navigate(`/documents?folder=${folder.id}&folderName=${encodeURIComponent(folder.name)}`);
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
                        <div className="folder-card card card-hover" key={folder.id}>
                            <div className="folder-card-header">
                                <div className="folder-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                    </svg>
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
                                    <span className="folder-meta">
                                        Created {formatDate(folder.createdAt)}
                                    </span>
                                </div>
                            </div>
                            <div className="folder-actions">
                                <button className="btn-icon" title="Open" onClick={() => handleOpenFolder(folder)}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v1M5 19h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2z" />
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
            {error && (
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
                <div className="modal-overlay" onClick={() => { if (!creating) { setShowCreateModal(false); setError(''); } }}>
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
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
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
                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => { setShowCreateModal(false); setError(''); }}
                                    disabled={creating}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={creating || !newFolderName.trim()}
                                >
                                    {creating ? 'Creating...' : 'Create'}
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
        </div>
    );
}

export default Folders;
