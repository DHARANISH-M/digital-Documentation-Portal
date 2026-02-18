import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { createDocument } from '../services/documents';
import { uploadFile, formatFileSize } from '../services/storage';
import { createFolder } from '../services/folders';
import './Upload.css';

function Upload() {
    const [file, setFile] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        description: '',
        folderId: ''
    });
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [showNewFolder, setShowNewFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [creatingFolder, setCreatingFolder] = useState(false);

    const { currentUser } = useAuth();
    const { documents, folders, loadFolders, loadDocuments, addFolderToCache, addDocumentToCache } = useData();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const STORAGE_LIMIT = 10 * 1024 * 1024 * 1024; // 10 GB in bytes

    // Calculate current storage usage from cached documents
    const storageUsed = useMemo(() => {
        return documents.reduce((total, doc) => total + (doc.fileSize || 0), 0);
    }, [documents]);

    const storageRemaining = STORAGE_LIMIT - storageUsed;
    const storagePercent = Math.min((storageUsed / STORAGE_LIMIT) * 100, 100);

    useEffect(() => {
        if (currentUser) {
            loadFolders();
            loadDocuments();
        }
    }, [currentUser]);

    const categories = [
        'Financial',
        'Legal',
        'HR',
        'Marketing',
        'Operations',
        'Other'
    ];

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (selectedFile) => {
        setFile(selectedFile);
        if (!formData.name) {
            setFormData(prev => ({
                ...prev,
                name: selectedFile.name.replace(/\.[^/.]+$/, '')
            }));
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!file) {
            setError('Please select a file to upload');
            return;
        }

        if (!formData.name) {
            setError('Please enter a document name');
            return;
        }

        if (!formData.category) {
            setError('Please select a category');
            return;
        }

        // Check storage limit
        if (file.size > storageRemaining) {
            setError(`Storage limit exceeded! You have ${formatFileSize(storageRemaining)} remaining out of 10 GB. This file is ${formatFileSize(file.size)}.`);
            return;
        }

        setError('');
        setUploading(true);

        try {
            // Upload file to Firebase Storage
            const uploadResult = await uploadFile(
                file,
                currentUser.uid,
                (progress) => setUploadProgress(progress)
            );

            const docData = {
                name: formData.name,
                category: formData.category,
                description: formData.description,
                folderId: formData.folderId || null,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                fileUrl: uploadResult.url,
                filePath: uploadResult.path,
                userId: currentUser.uid,
                owner: currentUser.displayName || currentUser.email
            };

            // Save document metadata to Firestore
            const docId = await createDocument(docData);

            // Add to cache so it appears instantly on other pages
            addDocumentToCache({
                id: docId,
                ...docData,
                createdAt: { toDate: () => new Date(), toMillis: () => Date.now() }
            });

            navigate('/documents');
        } catch (err) {
            console.error('Upload error:', err);
            setError('Failed to upload document. Please try again.');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleCancel = () => {
        navigate(-1);
    };

    return (
        <div className="upload-page fade-in">
            <div className="page-header">
                <h1 className="page-title">Upload Document</h1>
                <p className="page-subtitle">Upload a new document to your account</p>
            </div>

            {error && (
                <div className="upload-error">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    {error}
                </div>
            )}

            <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>📦 Storage Usage</span>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        {formatFileSize(storageUsed)} / 10 GB
                    </span>
                </div>
                <div style={{ background: '#e2e8f0', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
                    <div style={{
                        width: `${storagePercent}%`,
                        height: '100%',
                        borderRadius: '999px',
                        background: storagePercent > 90 ? '#ef4444' : storagePercent > 70 ? '#f59e0b' : '#22c55e',
                        transition: 'width 0.3s ease'
                    }} />
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.4rem' }}>
                    {formatFileSize(storageRemaining > 0 ? storageRemaining : 0)} remaining
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                <div
                    className={`drop-zone ${dragActive ? 'drop-zone-active' : ''} ${file ? 'drop-zone-has-file' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                        hidden
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                    />

                    {file ? (
                        <div className="selected-file">
                            <div className="selected-file-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                </svg>
                            </div>
                            <div className="selected-file-info">
                                <p className="selected-file-name">{file.name}</p>
                                <p className="selected-file-size">{formatFileSize(file.size)}</p>
                            </div>
                            <button
                                type="button"
                                className="remove-file-btn"
                                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="drop-zone-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                            </div>
                            <p className="drop-zone-text">Drag and drop your document</p>
                            <p className="drop-zone-hint">
                                or <span className="drop-zone-link">click to browse</span> files (PDF, DOCX, XLSX, etc.)
                            </p>
                        </>
                    )}
                </div>

                {uploading && (
                    <div className="upload-progress">
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                        <span className="progress-text">{Math.round(uploadProgress)}% uploaded</span>
                    </div>
                )}

                <div className="document-details card">
                    <h2 className="details-title">Document Details</h2>

                    <div className="details-grid">
                        <div className="form-group">
                            <label className="form-label" htmlFor="name">
                                Document Name <span className="required">*</span>
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                className="form-input"
                                placeholder="e.g., Q4 Budget Report"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="category">
                                Category <span className="required">*</span>
                            </label>
                            <select
                                id="category"
                                name="category"
                                className="form-select"
                                value={formData.category}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">Select a category</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="folderId">
                            Folder (Optional)
                        </label>
                        <div className="folder-selector-row">
                            <select
                                id="folderId"
                                name="folderId"
                                className="form-select"
                                value={formData.folderId}
                                onChange={handleInputChange}
                            >
                                <option value="">No folder (Unfiled)</option>
                                {folders.map(f => (
                                    <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm new-folder-btn"
                                onClick={() => setShowNewFolder(!showNewFolder)}
                                title="Create new folder"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                            </button>
                        </div>
                        {showNewFolder && (
                            <div className="new-folder-inline">
                                <input
                                    className="form-input"
                                    type="text"
                                    placeholder="New folder name"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    disabled={creatingFolder || !newFolderName.trim()}
                                    onClick={async () => {
                                        setCreatingFolder(true);
                                        setError('');
                                        try {
                                            const timeoutPromise = new Promise((_, reject) =>
                                                setTimeout(() => reject(new Error('Request timed out. Please check your internet connection.')), 15000)
                                            );
                                            const newId = await Promise.race([
                                                createFolder(newFolderName.trim(), currentUser.uid),
                                                timeoutPromise
                                            ]);
                                            addFolderToCache({
                                                id: newId,
                                                name: newFolderName.trim(),
                                                userId: currentUser.uid,
                                                createdAt: { toDate: () => new Date(), toMillis: () => Date.now() }
                                            });
                                            setFormData(prev => ({ ...prev, folderId: newId }));
                                            setNewFolderName('');
                                            setShowNewFolder(false);
                                        } catch (err) {
                                            console.error('Error creating folder:', err);
                                            if (err.code === 'permission-denied') {
                                                setError('Permission denied. Check Firestore security rules for the folders collection.');
                                            } else if (err.message?.includes('timed out')) {
                                                setError('Folder creation timed out. Check your internet connection and try again.');
                                            } else {
                                                setError(`Failed to create folder: ${err.message}`);
                                            }
                                        } finally {
                                            setCreatingFolder(false);
                                        }
                                    }}
                                >
                                    {creatingFolder ? '...' : 'Create'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="description">
                            Description (Optional)
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            className="form-input form-textarea"
                            placeholder="Add notes about this document..."
                            value={formData.description}
                            onChange={handleInputChange}
                            rows={3}
                        />
                    </div>
                </div>

                <div className="form-actions">
                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        disabled={uploading}
                    >
                        {uploading ? (
                            <>
                                <span className="spinner"></span>
                                Uploading...
                            </>
                        ) : (
                            'Upload Document'
                        )}
                    </button>
                    <button
                        type="button"
                        className="btn btn-secondary btn-lg"
                        onClick={handleCancel}
                        disabled={uploading}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

export default Upload;
