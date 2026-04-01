import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { isAdmin, getAllUsers, getAllTickets, resolveTicket, closeTicket, updateUserStatus, deleteUserRecord } from '../services/admin';
import { getDocuments } from '../services/documents';
import './Admin.css';

function Admin() {
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userDocCounts, setUserDocCounts] = useState({});
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [adminResponse, setAdminResponse] = useState('');
    const [resolving, setResolving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [processingUser, setProcessingUser] = useState(null);
    const [viewingUser, setViewingUser] = useState(null);
    const [viewingUserDocs, setViewingUserDocs] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(false);

    const { currentUser } = useAuth();

    useEffect(() => {
        if (activeTab === 'users') {
            loadUsers();
        } else {
            loadTickets();
        }
    }, [activeTab]);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const allUsers = await getAllUsers();
            setUsers(allUsers);

            // Get document counts for each user
            const counts = {};
            for (const user of allUsers) {
                try {
                    const docs = await getDocuments(user.uid);
                    counts[user.uid] = docs.length;
                } catch {
                    counts[user.uid] = 0;
                }
            }
            setUserDocCounts(counts);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTickets = async () => {
        setLoading(true);
        try {
            const allTickets = await getAllTickets();
            setTickets(allTickets);
        } catch (error) {
            console.error('Error loading tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async () => {
        if (!selectedTicket || !adminResponse.trim()) return;

        setResolving(true);
        try {
            await resolveTicket(selectedTicket.id, adminResponse);
            setSelectedTicket(null);
            setAdminResponse('');
            loadTickets();
        } catch (error) {
            console.error('Error resolving ticket:', error);
        } finally {
            setResolving(false);
        }
    };

    const handleClose = async (ticketId) => {
        try {
            await closeTicket(ticketId);
            loadTickets();
        } catch (error) {
            console.error('Error closing ticket:', error);
        }
    };

    const handleToggleUserStatus = async (user) => {
        setProcessingUser(user.id);
        try {
            await updateUserStatus(user.id, { disabled: !user.disabled });
            loadUsers();
        } catch (error) {
            console.error('Error updating user status:', error);
        } finally {
            setProcessingUser(null);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
        setProcessingUser(userId);
        try {
            await deleteUserRecord(userId);
            loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
        } finally {
            setProcessingUser(null);
        }
    };

    const getFilteredUsers = () => {
        return users.filter(user => {
            const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  (user.displayName && user.displayName.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesStatus = statusFilter === 'all' ? true : 
                                  statusFilter === 'active' ? !user.disabled : 
                                  user.disabled;
            return matchesSearch && matchesStatus;
        });
    };

    const handleViewUser = async (user) => {
        setViewingUser(user);
        setLoadingDocs(true);
        try {
            const docs = await getDocuments(user.uid);
            setViewingUserDocs(docs);
        } catch (error) {
            console.error('Error fetching user documents:', error);
            setViewingUserDocs([]);
        } finally {
            setLoadingDocs(false);
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (!isAdmin(currentUser?.email)) {
        return (
            <div className="admin-page fade-in">
                <div className="access-denied">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                    <h2>Access Denied</h2>
                    <p>You don't have permission to access this page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page fade-in">
            <div className="admin-header">
                <h1 className="admin-title">Admin Panel</h1>
                <p className="admin-subtitle">Manage users and support tickets</p>
            </div>

            <div className="admin-tabs">
                <button
                    className={`admin-tab ${activeTab === 'users' ? 'admin-tab-active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    Users ({users.length})
                </button>
                <button
                    className={`admin-tab ${activeTab === 'tickets' ? 'admin-tab-active' : ''}`}
                    onClick={() => setActiveTab('tickets')}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Help Tickets ({tickets.filter(t => t.status === 'open').length} open)
                </button>
            </div>

            {loading ? (
                <div className="admin-loading">
                    <div className="spinner"></div>
                    <p>Loading...</p>
                </div>
            ) : activeTab === 'users' ? (
                <div className="users-section">
                    <div className="admin-filters" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="form-input"
                            style={{ flex: 1 }}
                        />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="form-select"
                            style={{ width: '150px' }}
                        >
                            <option value="all">All Users</option>
                            <option value="active">Active</option>
                            <option value="disabled">Disabled</option>
                        </select>
                    </div>
                    <div className="users-table-wrapper">
                        <table className="users-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Email</th>
                                    <th>Joined</th>
                                    <th>Last Login</th>
                                    <th>Documents</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {getFilteredUsers().map(user => (
                                    <tr key={user.id} className={user.disabled ? 'user-disabled' : ''}>
                                        <td>
                                            <div className="user-cell">
                                                <div className="user-avatar" style={{ opacity: user.disabled ? 0.5 : 1 }}>
                                                    {user.displayName?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <span>{user.displayName || 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td>{user.email}</td>
                                        <td>{formatDate(user.createdAt)}</td>
                                        <td>{formatDate(user.lastLoginAt)}</td>
                                        <td>
                                            <span className="doc-count">{userDocCounts[user.uid] || 0}</span>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${user.disabled ? 'status-disabled' : 'status-active'}`} style={{
                                                padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem',
                                                backgroundColor: user.disabled ? '#fee2e2' : '#dcfce7',
                                                color: user.disabled ? '#991b1b' : '#166534'
                                            }}>
                                                {user.disabled ? 'Disabled' : 'Active'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons" style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button 
                                                    onClick={() => handleViewUser(user)}
                                                    className="btn btn-sm"
                                                    style={{ backgroundColor: '#e2e8f0', color: '#1e293b', border: 'none' }}
                                                >
                                                    View
                                                </button>
                                                <button 
                                                    onClick={() => handleToggleUserStatus(user)}
                                                    disabled={processingUser === user.id}
                                                    className={`btn btn-sm ${user.disabled ? 'btn-primary' : 'btn-secondary'}`}
                                                >
                                                    {user.disabled ? 'Enable' : 'Disable'}
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    disabled={processingUser === user.id}
                                                    className="btn btn-sm"
                                                    style={{ backgroundColor: '#ef4444', color: 'white', border: 'none' }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {getFilteredUsers().length === 0 && (
                        <div className="empty-state">
                            <p>No users found matching your criteria.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="tickets-section">
                    {tickets.length === 0 ? (
                        <div className="empty-state">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            <p>No help tickets yet.</p>
                        </div>
                    ) : (
                        <div className="tickets-list">
                            {tickets.map(ticket => (
                                <div key={ticket.id} className={`ticket-card ticket-${ticket.status}`}>
                                    <div className="ticket-header">
                                        <h3 className="ticket-subject">{ticket.subject}</h3>
                                        <span className={`ticket-status status-${ticket.status}`}>
                                            {ticket.status}
                                        </span>
                                    </div>
                                    <p className="ticket-description">{ticket.description}</p>
                                    <div className="ticket-meta">
                                        <span>From: {ticket.userEmail}</span>
                                        <span>Created: {formatDate(ticket.createdAt)}</span>
                                    </div>

                                    {ticket.status === 'resolved' && ticket.adminResponse && (
                                        <div className="ticket-response">
                                            <strong>Admin Response:</strong>
                                            <p>{ticket.adminResponse}</p>
                                        </div>
                                    )}

                                    {ticket.status === 'open' && (
                                        <div className="ticket-actions">
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => setSelectedTicket(ticket)}
                                            >
                                                Respond
                                            </button>
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => handleClose(ticket.id)}
                                            >
                                                Close
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Respond Modal */}
            {selectedTicket && (
                <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3>Respond to Ticket</h3>
                        <p className="modal-ticket-subject">{selectedTicket.subject}</p>
                        <div className="form-group">
                            <label className="form-label">Your Response</label>
                            <textarea
                                className="form-input form-textarea"
                                value={adminResponse}
                                onChange={e => setAdminResponse(e.target.value)}
                                placeholder="Enter your response to resolve this issue..."
                                rows={4}
                            />
                        </div>
                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setSelectedTicket(null)}
                                disabled={resolving}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleResolve}
                                disabled={resolving || !adminResponse.trim()}
                            >
                                {resolving ? 'Resolving...' : 'Resolve Ticket'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View User Modal */}
            {viewingUser && (
                <div className="modal-overlay" onClick={() => setViewingUser(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>User Details</h3>
                            <button 
                                onClick={() => setViewingUser(null)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                            <div className="detail-item">
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>Name</label>
                                <div style={{ fontWeight: 500 }}>{viewingUser.displayName || 'N/A'}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>Email</label>
                                <div style={{ fontWeight: 500 }}>{viewingUser.email}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>Status</label>
                                <div>
                                    <span className={`status-badge ${viewingUser.disabled ? 'status-disabled' : 'status-active'}`} style={{
                                        padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem',
                                        backgroundColor: viewingUser.disabled ? '#fee2e2' : '#dcfce7',
                                        color: viewingUser.disabled ? '#991b1b' : '#166534'
                                    }}>
                                        {viewingUser.disabled ? 'Disabled' : 'Active'}
                                    </span>
                                </div>
                            </div>
                            <div className="detail-item">
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>User ID</label>
                                <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{viewingUser.uid}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>Joined</label>
                                <div style={{ fontWeight: 500 }}>{formatDate(viewingUser.createdAt)}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>Last Login</label>
                                <div style={{ fontWeight: 500 }}>{formatDate(viewingUser.lastLoginAt)}</div>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                            <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                Uploaded Documents
                                <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', color: '#475569' }}>
                                    {loadingDocs ? '...' : viewingUserDocs.length}
                                </span>
                            </h4>
                            
                            {loadingDocs ? (
                                <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', margin: '2rem 0' }}>Loading documents...</p>
                            ) : viewingUserDocs.length === 0 ? (
                                <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', margin: '2rem 0', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                                    This user hasn't uploaded any documents yet.
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {viewingUserDocs.slice(0, 10).map(doc => (
                                        <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                                <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.4rem', borderRadius: '4px' }}>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                        <polyline points="14 2 14 8 20 8" />
                                                    </svg>
                                                </div>
                                                <div style={{ overflow: 'hidden' }}>
                                                    <p style={{ margin: 0, fontWeight: 500, fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{doc.name || doc.fileName}</p>
                                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{formatDate(doc.createdAt)}</p>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap', marginLeft: '1rem' }}>
                                                {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                                            </div>
                                        </div>
                                    ))}
                                    {viewingUserDocs.length > 10 && (
                                        <div style={{ textAlign: 'center', padding: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                                            + {viewingUserDocs.length - 10} more documents
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="modal-actions" style={{ marginTop: '2rem' }}>
                            <button
                                className="btn btn-primary"
                                onClick={() => setViewingUser(null)}
                                style={{ width: '100%' }}
                            >
                                Close Summary
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Admin;
