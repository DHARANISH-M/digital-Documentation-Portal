import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { deleteDocument } from '../services/documents';
import { deleteFile } from '../services/storage';
import DocumentCard from '../components/DocumentCard';
import './Documents.css';

function Documents() {
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const { currentUser } = useAuth();
    const { documents, documentsLoading, documentsError, loadDocuments, removeDocumentFromCache } = useData();
    const [searchParams] = useSearchParams();
    const folderId = searchParams.get('folder');
    const folderName = searchParams.get('folderName');

    useEffect(() => {
        if (currentUser) {
            loadDocuments();
        }
    }, [currentUser]);

    // Filter documents by folder client-side from cache
    const filteredDocuments = useMemo(() => {
        if (folderId) {
            return documents.filter(doc => doc.folderId === folderId);
        }
        return documents;
    }, [documents, folderId]);

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
        </div>
    );
}

export default Documents;
