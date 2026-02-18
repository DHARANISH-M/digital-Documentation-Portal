import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { formatFileSize } from '../services/storage';
import { saveUser } from '../services/admin';
import './Dashboard.css';

function Dashboard() {
    const { currentUser } = useAuth();
    const { documents, documentsLoading, loadDocuments } = useData();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function init() {
            if (currentUser) {
                await loadDocuments();
                // Auto-sync user to Firestore for Admin panel (non-blocking)
                try { saveUser(currentUser); } catch (e) { /* silent */ }
            }
            setLoading(false);
        }
        init();
    }, [currentUser]);

    // Compute stats from cached documents
    const stats = useMemo(() => {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const recentUploads = documents.filter(doc => {
            if (doc.createdAt?.toDate) {
                return doc.createdAt.toDate() > oneWeekAgo;
            }
            return false;
        });

        const totalSize = documents.reduce((acc, doc) => acc + (doc.fileSize || 0), 0);

        return {
            totalDocuments: documents.length,
            recentUploads: recentUploads.length,
            storageUsed: totalSize,
            recentActivity: documents.slice(0, 5)
        };
    }, [documents]);

    const isLoading = loading || documentsLoading;

    const getUserName = () => {
        return currentUser?.displayName?.split(' ')[0] || 'User';
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="dashboard fade-in">
            <div className="dashboard-header">
                <h1 className="dashboard-title">
                    Welcome Back, {getUserName()}! <span className="wave">👋</span>
                </h1>
                <p className="dashboard-subtitle">
                    Here's an overview of your document management activity
                </p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-content">
                        <p className="stat-label">Total Documents</p>
                        <p className="stat-value">{isLoading ? '...' : stats.totalDocuments}</p>
                        <p className="stat-description">All documents in your account</p>
                    </div>
                    <div className="stat-icon stat-icon-blue">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                        </svg>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-content">
                        <p className="stat-label">Recent Uploads</p>
                        <p className="stat-value">{isLoading ? '...' : stats.recentUploads}</p>
                        <p className="stat-description">Uploaded this week</p>
                    </div>
                    <div className="stat-icon stat-icon-yellow">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-content">
                        <p className="stat-label">Storage Usage</p>
                        <p className="stat-value">{isLoading ? '...' : formatFileSize(stats.storageUsed)}</p>
                        <p className="stat-description">of 10 GB limit</p>
                    </div>
                    <div className="stat-icon stat-icon-orange">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        </svg>
                    </div>
                    <div className="storage-bar">
                        <div
                            className="storage-progress"
                            style={{
                                width: `${Math.min((stats.storageUsed / (10 * 1024 * 1024 * 1024)) * 100, 100)}%`,
                                backgroundColor: stats.storageUsed > (9 * 1024 * 1024 * 1024) ? '#ef4444' : undefined
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="quick-actions-card">
                <div className="quick-actions-content">
                    <h2 className="quick-actions-title">Ready to organize your documents?</h2>
                    <p className="quick-actions-text">
                        Start by uploading a new document or browse your existing files
                    </p>
                </div>
                <div className="quick-actions-buttons">
                    <Link to="/upload" className="btn btn-primary">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Upload Document
                    </Link>
                    <Link to="/documents" className="btn btn-secondary">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                        View All
                    </Link>
                </div>
            </div>

            <div className="recent-activity">
                <h2 className="section-title">Recent Activity</h2>

                {isLoading ? (
                    <div className="activity-loading">
                        <div className="spinner"></div>
                        <p>Loading activity...</p>
                    </div>
                ) : stats.recentActivity.length > 0 ? (
                    <div className="activity-list">
                        {stats.recentActivity.map((doc) => (
                            <div key={doc.id} className="activity-item">
                                <div className="activity-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                </div>
                                <div className="activity-info">
                                    <p className="activity-name">{doc.name}</p>
                                    <p className="activity-time">Uploaded {formatDate(doc.createdAt)}</p>
                                </div>
                                <span className="activity-size">{formatFileSize(doc.fileSize || 0)}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="activity-empty">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <p>No documents yet</p>
                        <Link to="/upload" className="btn btn-primary">
                            Upload your first document
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
