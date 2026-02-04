import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDocuments, deleteDocument } from '../services/documents';
import { deleteFile } from '../services/storage';
import DocumentCard from '../components/DocumentCard';
import './Documents.css';

function Documents() {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const { currentUser } = useAuth();

    useEffect(() => {
        fetchDocuments();
    }, [currentUser]);

    const fetchDocuments = async () => {
        try {
            const docs = await getDocuments(currentUser.uid);
            setDocuments(docs);
        } catch (error) {
            console.error('Error fetching documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleView = (document) => {
        if (document.fileUrl) {
            window.open(document.fileUrl, '_blank');
        }
    };

    const handleDownload = async (document) => {
        if (document.fileUrl) {
            const link = document.createElement ? document.createElement('a') : window.document.createElement('a');
            link.href = document.fileUrl;
            link.download = document.fileName || document.name;
            link.target = '_blank';
            document.body ? document.body.appendChild(link) : window.document.body.appendChild(link);
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
            // Update local state
            setDocuments(prev => prev.filter(d => d.id !== documentToDelete.id));
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
                <h1 className="page-title">View Documents</h1>
                <p className="page-subtitle">Browse and manage all your documents</p>
            </div>

            <p className="documents-count">
                Showing <strong>{documents.length}</strong> documents
            </p>

            {loading ? (
                <div className="documents-loading">
                    <div className="spinner"></div>
                    <p>Loading documents...</p>
                </div>
            ) : documents.length > 0 ? (
                <div className="documents-grid">
                    {documents.map(doc => (
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
