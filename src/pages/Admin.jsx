import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { isAdmin, getAllUsers, getAllTickets, resolveTicket, closeTicket } from '../services/admin';
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
                    <div className="users-table-wrapper">
                        <table className="users-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Email</th>
                                    <th>Joined</th>
                                    <th>Last Login</th>
                                    <th>Documents</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td>
                                            <div className="user-cell">
                                                <div className="user-avatar">
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
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {users.length === 0 && (
                        <div className="empty-state">
                            <p>No users found.</p>
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
        </div>
    );
}

export default Admin;
