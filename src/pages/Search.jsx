import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { deleteFile } from '../services/storage';
import { deleteDocument, renameDocument } from '../services/documents';
import DocumentCard from '../components/DocumentCard';
import './Search.css';

function Search() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const { currentUser } = useAuth();
    const { documents, documentsLoading, loadDocuments, removeDocumentFromCache, updateDocumentInCache, folders, loadFolders } = useData();

    const categories = ['All', 'Financial', 'Legal', 'HR', 'Marketing', 'Operations', 'Other'];

    useEffect(() => {
        if (currentUser) {
            loadDocuments();
            loadFolders();
        }
    }, [currentUser]);

    // Get IDs of all protected folders (to hide their documents from search)
    const protectedFolderIds = useMemo(() => {
        return new Set(folders.filter(f => f.isProtected).map(f => f.id));
    }, [folders]);

    // Filter documents client-side from cache
    const filteredDocuments = useMemo(() => {
        // First, exclude documents in protected folders
        let results = documents.filter(doc => !doc.folderId || !protectedFolderIds.has(doc.folderId));

        // Filter by category
        if (selectedCategory && selectedCategory !== 'All') {
            results = results.filter(doc => doc.category === selectedCategory);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            results = results.filter(doc =>
                doc.name?.toLowerCase().includes(query) ||
                doc.owner?.toLowerCase().includes(query)
            );
        }

        return results;
    }, [documents, selectedCategory, searchQuery, protectedFolderIds]);

    const handleSearch = (e) => {
        e.preventDefault();
        // No need to fetch — filtering happens automatically via useMemo
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
            // Update cache locally
            removeDocumentFromCache(documentToDelete.id);
            setDeleteModalOpen(false);
            setDocumentToDelete(null);
        } catch (error) {
            console.error('Error deleting document:', error);
        } finally {
            setDeleting(false);
        }
    };

    const handleRename = async (document, newName) => {
        await renameDocument(document.id, newName);
        updateDocumentInCache(document.id, { name: newName });
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
                    Found <strong>{filteredDocuments.length}</strong> documents
                </p>
            </div>

            {documentsLoading && !documents.length ? (
                <div className="search-loading">
                    <div className="spinner"></div>
                    <p>Searching...</p>
                </div>
            ) : filteredDocuments.length > 0 ? (
                <div className="search-results-grid">
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
