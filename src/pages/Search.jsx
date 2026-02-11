import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { searchDocuments } from '../services/documents';
import { deleteFile } from '../services/storage';
import { deleteDocument } from '../services/documents';
import DocumentCard from '../components/DocumentCard';
import './Search.css';

function Search() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const { currentUser } = useAuth();

    const categories = ['All', 'Financial', 'Legal', 'HR', 'Marketing', 'Operations', 'Other'];

    useEffect(() => {
        performSearch();
    }, [currentUser, selectedCategory]);

    const performSearch = async () => {
        setLoading(true);
        try {
            const results = await searchDocuments(
                currentUser.uid,
                searchQuery,
                selectedCategory
            );
            setDocuments(results);
        } catch (error) {
            console.error('Error searching documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        performSearch();
    };

    const handleView = (document) => {
        if (document.fileUrl) {
            window.open(document.fileUrl, '_blank');
        }
    };

    const handleDownload = (document) => {
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
            if (documentToDelete.filePath) {
                await deleteFile(documentToDelete.filePath);
            }
            await deleteDocument(documentToDelete.id);
            setDocuments(prev => prev.filter(d => d.id !== documentToDelete.id));
            setDeleteModalOpen(false);
            setDocumentToDelete(null);
        } catch (error) {
            console.error('Error deleting document:', error);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="search-page fade-in">
            <div className="page-header">
                <h1 className="page-title">Search & Filter</h1>
                <p className="page-subtitle">Find documents using search and category filters</p>
            </div>

            <div className="search-controls">
                <form onSubmit={handleSearch} className="search-form">
                    <div className="search-input-wrapper">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search by document name, category, or owner..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </form>

                <div className="category-filters">
                    {categories.map(category => (
                        <button
                            key={category}
                            className={`category-btn ${selectedCategory === category ? 'category-btn-active' : ''}`}
                            onClick={() => setSelectedCategory(category)}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </div>

            <div className="results-header">
                <p className="results-count">
                    Found <strong>{documents.length}</strong> documents
                </p>
            </div>

            {loading ? (
                <div className="search-loading">
                    <div className="spinner"></div>
                    <p>Searching...</p>
                </div>
            ) : documents.length > 0 ? (
                <div className="search-results-grid">
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
                <div className="search-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <h3>No documents found</h3>
                    <p>Try adjusting your search or filters</p>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && (
                <div className="modal-overlay" onClick={() => !deleting && setDeleteModalOpen(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3 className="modal-title">Delete Document</h3>
                        <p className="modal-text">
                            Are you sure you want to delete "{documentToDelete?.name}"?
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

export default Search;
