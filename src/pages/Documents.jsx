import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { deleteDocument, renameDocument } from '../services/documents';
import { deleteFile } from '../services/storage';
import DocumentCard from '../components/DocumentCard';
import FolderPasswordModal from '../components/FolderPasswordModal';
import './Documents.css';

function Documents() {
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [pendingFolder, setPendingFolder] = useState(null);

    const { currentUser } = useAuth();
    const {
        documents, documentsLoading, documentsError, loadDocuments, removeDocumentFromCache, updateDocumentInCache,
        folders, loadFolders,
        hasFolderAccess, grantFolderAccess, getFolderAccessTimeRemaining
    } = useData();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const folderId = searchParams.get('folder');
    const folderName = searchParams.get('folderName');

    useEffect(() => {
        if (currentUser) {
            loadDocuments();
            loadFolders();
        }
    }, [currentUser]);

    // Check if the folder is protected and user doesn't have access
    useEffect(() => {
        if (folderId && folders.length > 0) {
            const folder = folders.find(f => f.id === folderId);
            if (folder && folder.isProtected && !hasFolderAccess(folderId)) {
                setPendingFolder(folder);
                setShowPasswordModal(true);
            }
        }
    }, [folderId, folders, hasFolderAccess]);

    // Get IDs of all protected folders (to hide their documents from "All Documents")
    const protectedFolderIds = useMemo(() => {
        return new Set(folders.filter(f => f.isProtected).map(f => f.id));
    }, [folders]);

    // Filter documents by folder client-side from cache
    const filteredDocuments = useMemo(() => {
        // Viewing a specific folder
        if (folderId) {
            const folder = folders.find(f => f.id === folderId);
            // If folder is protected and we don't have access, show nothing
            if (folder && folder.isProtected && !hasFolderAccess(folderId)) {
                return [];
            }
            return documents.filter(doc => doc.folderId === folderId);
        }
        // "All Documents" view — exclude documents in protected folders
        return documents.filter(doc => !doc.folderId || !protectedFolderIds.has(doc.folderId));
    }, [documents, folderId, folders, hasFolderAccess, protectedFolderIds]);

    // Access time remaining for display
    const accessTimeRemaining = folderId ? getFolderAccessTimeRemaining(folderId) : null;

    // Check if current folder is protected and locked
    const isLockedFolder = useMemo(() => {
        if (!folderId) return false;
        const folder = folders.find(f => f.id === folderId);
        return folder?.isProtected && !hasFolderAccess(folderId);
    }, [folderId, folders, hasFolderAccess]);

    const handleView = (document) => {
        if (document.fileUrl) {
            window.open(document.fileUrl, '_blank');
        }
    };

    const handleDownload = async (document) => {
        if (document.fileUrl) {
            const link = window.document.createElement('a');
            link.href = document.fileUrl;
            link.download = document.fileName || document.name;
            link.target = '_blank';
            window.document.body.appendChild(link);
            link.click();
            link.remove();
        }
    };

    const handleShare = (document) => {
        if (navigator.share) {
            navigator.share({
                title: document.name,
                url: document.fileUrl
            });
        } else {
            navigator.clipboard.writeText(document.fileUrl);
            alert('Link copied to clipboard!');
        }
    };

    const handleDeleteClick = (document) => {
        setDocumentToDelete(document);
        setDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!documentToDelete) return;

        setDeleting(true);
        try {
            // Delete file from storage
            if (documentToDelete.filePath) {
                await deleteFile(documentToDelete.filePath);
            }
            // Delete document metadata from Firestore
            await deleteDocument(documentToDelete.id);
            // Update cache locally (no re-fetch needed)
            removeDocumentFromCache(documentToDelete.id);
            setDeleteModalOpen(false);
            setDocumentToDelete(null);
        } catch (error) {
            console.error('Error deleting document:', error);
            alert('Failed to delete document. Please try again.');
        } finally {
            setDeleting(false);
        }
    };

    const handleRename = async (document, newName) => {
        await renameDocument(document.id, newName);
        updateDocumentInCache(document.id, { name: newName });
    };

    const handlePasswordSuccess = (folder) => {
        grantFolderAccess(folder.id);
        setShowPasswordModal(false);
        setPendingFolder(null);
    };

    const handlePasswordClose = () => {
        setShowPasswordModal(false);
        setPendingFolder(null);
        // Navigate back to folders page if user cancels
        navigate('/folders');
    };

    return (
        <div className="documents-page fade-in">
            <div className="page-header">
                <h1 className="page-title">
                    {folderName ? folderName : 'View Documents'}
                </h1>
                <p className="page-subtitle">
                    {folderName ? 'Documents in this folder' : 'Browse and manage all your documents'}
                </p>
            </div>

            {folderId && (
                <div className="breadcrumb">
                    <Link to="/documents" className="breadcrumb-link">All Documents</Link>
                    <span className="breadcrumb-sep">/</span>
                    <Link to="/folders" className="breadcrumb-link">Folders</Link>
                    <span className="breadcrumb-sep">/</span>
                    <span className="breadcrumb-current">{folderName || 'Folder'}</span>
                    {accessTimeRemaining && (
                        <span className="folder-session-badge" style={{ marginLeft: '8px' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="10" height="10">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            {accessTimeRemaining}m access remaining
                        </span>
                    )}
                </div>
            )}

            {documentsError && (
                <div className="upload-error" style={{ marginBottom: '1rem' }}>
                    <p>{documentsError}</p>
                    <button className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => loadDocuments(true)}>
                        Retry
                    </button>
                </div>
            )}

            {/* Locked folder message */}
            {isLockedFolder ? (
                <div className="documents-locked">
                    <div className="documents-locked-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                    </div>
                    <h3>This folder is password protected</h3>
                    <p>Enter the password to view the documents in this folder.</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            const folder = folders.find(f => f.id === folderId);
                            if (folder) {
                                setPendingFolder(folder);
                                setShowPasswordModal(true);
                            }
                        }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        Unlock Folder
                    </button>
                </div>
            ) : (
                <>
                    <p className="documents-count">
                        Showing <strong>{filteredDocuments.length}</strong> documents
                    </p>

                    {documentsLoading && !documents.length ? (
                        <div className="documents-loading">
                            <div className="spinner"></div>
                            <p>Loading documents...</p>
                        </div>
                    ) : filteredDocuments.length > 0 ? (
                        <div className="documents-grid">
                            {filteredDocuments.map(doc => (
                                <DocumentCard
                                    key={doc.id}
                                    document={doc}
                                    onView={handleView}
                                    onDownload={handleDownload}
                                    onShare={handleShare}
                                    onDelete={handleDeleteClick}
                                    onRename={handleRename}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="documents-empty">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                            </svg>
                            <h3>No documents yet</h3>
                            <p>Start by uploading your first document</p>
                            <a href="/upload" className="btn btn-primary">
                                Upload Document
                            </a>
                        </div>
                    )}
                </>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && (
                <div className="modal-overlay" onClick={() => !deleting && setDeleteModalOpen(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3 className="modal-title">Delete Document</h3>
                        <p className="modal-text">
                            Are you sure you want to delete "{documentToDelete?.name}"? This action cannot be undone.
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
            {showPasswordModal && pendingFolder && (
                <FolderPasswordModal
                    folder={pendingFolder}
                    onSuccess={handlePasswordSuccess}
                    onClose={handlePasswordClose}
                />
            )}
        </div>
    );
}

export default Documents;
