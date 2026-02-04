import { formatFileSize, getFileType } from '../services/storage';
import './DocumentCard.css';

function DocumentCard({ document, onView, onDownload, onShare, onDelete }) {
    const getCategoryClass = (category) => {
        const categoryMap = {
            'Financial': 'badge-financial',
            'Legal': 'badge-legal',
            'HR': 'badge-hr',
            'Marketing': 'badge-marketing',
            'Operations': 'badge-operations'
        };
        return categoryMap[category] || 'badge-other';
    };

    const getFileIcon = (type) => {
        const iconColors = {
            'PDF': '#EF4444',
            'DOC': '#3B82F6',
            'DOCX': '#3B82F6',
            'XLS': '#10B981',
            'XLSX': '#10B981',
            'PPT': '#F59E0B',
            'PPTX': '#F59E0B'
        };
        return iconColors[type] || '#6B7280';
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

    const fileType = getFileType(document.fileName || document.name || '');

    return (
        <div className="document-card card card-hover">
            <div className="document-card-header">
                <div className="document-icon" style={{ backgroundColor: `${getFileIcon(fileType)}15` }}>
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={getFileIcon(fileType)}
                        strokeWidth="2"
                    >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                </div>
                <div className="document-info">
                    <h3 className="document-name">{document.name}</h3>
                    <span className="document-type">{fileType}</span>
                </div>
            </div>

            <div className="document-category">
                <span className={`badge ${getCategoryClass(document.category)}`}>
                    {document.category || 'Other'}
                </span>
            </div>

            <div className="document-meta">
                <div className="document-meta-row">
                    <span className="meta-value">{formatFileSize(document.fileSize || 0)}</span>
                    <span className="meta-date">{formatDate(document.createdAt)}</span>
                </div>
                {document.owner && (
                    <p className="document-owner">
                        <span className="owner-label">Owner:</span> {document.owner}
                    </p>
                )}
            </div>

            <div className="document-actions">
                <button
                    className="btn-icon"
                    onClick={() => onView?.(document)}
                    title="View"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                </button>
                <button
                    className="btn-icon"
                    onClick={() => onDownload?.(document)}
                    title="Download"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                </button>
                <button
                    className="btn-icon"
                    onClick={() => onShare?.(document)}
                    title="Share"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                </button>
                <button
                    className="btn-icon btn-icon-danger"
                    onClick={() => onDelete?.(document)}
                    title="Delete"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

export default DocumentCard;
