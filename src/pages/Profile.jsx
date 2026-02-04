import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from 'firebase/auth';
import { auth } from '../config/firebase';
import './Profile.css';

function Profile() {
    const { currentUser } = useAuth();
    const [editing, setEditing] = useState(false);
    const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const getUserInitials = () => {
        if (currentUser?.displayName) {
            return currentUser.displayName
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
        }
        return currentUser?.email?.charAt(0).toUpperCase() || 'U';
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage('');

        try {
            await updateProfile(auth.currentUser, {
                displayName: displayName
            });
            setMessage('Profile updated successfully!');
            setEditing(false);
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage('Failed to update profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setDisplayName(currentUser?.displayName || '');
        setEditing(false);
    };

    return (
        <div className="profile-page fade-in">
            <div className="page-header">
                <h1 className="page-title">Profile</h1>
                <p className="page-subtitle">Manage your account settings</p>
            </div>

            {message && (
                <div className={`profile-message ${message.includes('success') ? 'success' : 'error'}`}>
                    {message}
                </div>
            )}

            <div className="profile-card card">
                <div className="profile-header">
                    <div className="profile-avatar">
                        {getUserInitials()}
                    </div>
                    <div className="profile-info">
                        <h2 className="profile-name">{currentUser?.displayName || 'User'}</h2>
                        <p className="profile-email">{currentUser?.email}</p>
                    </div>
                    {!editing && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => setEditing(true)}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Edit Profile
                        </button>
                    )}
                </div>

                {editing && (
                    <div className="profile-edit-form">
                        <div className="form-group">
                            <label className="form-label" htmlFor="displayName">Display Name</label>
                            <input
                                id="displayName"
                                type="text"
                                className="form-input"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Enter your name"
                            />
                        </div>
                        <div className="profile-edit-actions">
                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={handleCancel}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="profile-section card">
                <h3 className="section-title">Account Information</h3>
                <div className="info-grid">
                    <div className="info-item">
                        <span className="info-label">Email</span>
                        <span className="info-value">{currentUser?.email}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Account ID</span>
                        <span className="info-value">{currentUser?.uid?.slice(0, 16)}...</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Account Created</span>
                        <span className="info-value">
                            {currentUser?.metadata?.creationTime
                                ? new Date(currentUser.metadata.creationTime).toLocaleDateString()
                                : 'N/A'}
                        </span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Last Sign In</span>
                        <span className="info-value">
                            {currentUser?.metadata?.lastSignInTime
                                ? new Date(currentUser.metadata.lastSignInTime).toLocaleDateString()
                                : 'N/A'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="profile-section card">
                <h3 className="section-title">Security</h3>
                <div className="security-options">
                    <div className="security-item">
                        <div className="security-info">
                            <h4>Password</h4>
                            <p>Change your account password</p>
                        </div>
                        <button className="btn btn-secondary">
                            Change Password
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Profile;
