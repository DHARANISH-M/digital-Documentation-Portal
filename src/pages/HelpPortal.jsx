import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { createHelpTicket, getUserTickets } from '../services/admin';
import './HelpPortal.css';

function HelpPortal() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState('');
    const [formData, setFormData] = useState({
        subject: '',
        description: ''
    });

    const { currentUser } = useAuth();

    useEffect(() => {
        loadTickets();
    }, [currentUser]);

    const loadTickets = async () => {
        setLoading(true);
        try {
            const userTickets = await getUserTickets(currentUser.uid);
            setTickets(userTickets);
        } catch (error) {
            console.error('Error loading tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.subject.trim() || !formData.description.trim()) return;

        setSubmitting(true);
        try {
            await createHelpTicket({
                userId: currentUser.uid,
                userEmail: currentUser.email,
                userName: currentUser.displayName || currentUser.email,
                subject: formData.subject,
                description: formData.description
            });

            setFormData({ subject: '', description: '' });
            setShowForm(false);
            setSuccess('Your help request has been submitted. We\'ll get back to you soon!');
            loadTickets();

            setTimeout(() => setSuccess(''), 5000);
        } catch (error) {
            console.error('Error creating ticket:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="help-page fade-in">
            <div className="help-header">
                <div>
                    <h1 className="help-title">Help & Support</h1>
                    <p className="help-subtitle">Get help with any issues you're experiencing</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? (
                        <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            Cancel
                        </>
                    ) : (
                        <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            New Request
                        </>
                    )}
                </button>
            </div>

            {success && (
                <div className="help-success">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    {success}
                </div>
            )}

            {showForm && (
                <div className="help-form-card">
                    <h2>Submit a Help Request</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="subject">
                                Subject <span className="required">*</span>
                            </label>
                            <input
                                id="subject"
                                type="text"
                                className="form-input"
                                placeholder="Brief description of your issue"
                                value={formData.subject}
                                onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="description">
                                Description <span className="required">*</span>
                            </label>
                            <textarea
                                id="description"
                                className="form-input form-textarea"
                                placeholder="Please describe your issue in detail..."
                                value={formData.description}
                                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                rows={5}
                                required
                            />
                        </div>
                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowForm(false)}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={submitting || !formData.subject.trim() || !formData.description.trim()}
                            >
                                {submitting ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="tickets-section">
                <h2 className="section-title">Your Requests</h2>

                {loading ? (
                    <div className="help-loading">
                        <div className="spinner"></div>
                        <p>Loading your tickets...</p>
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="help-empty">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <h3>No requests yet</h3>
                        <p>When you submit a help request, it will appear here.</p>
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
                                <p className="ticket-date">Submitted: {formatDate(ticket.createdAt)}</p>

                                {ticket.status === 'resolved' && ticket.adminResponse && (
                                    <div className="ticket-response">
                                        <strong>Response from Admin:</strong>
                                        <p>{ticket.adminResponse}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default HelpPortal;
