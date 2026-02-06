import { createContext, useContext, useState, useEffect } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    onAuthStateChanged,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { saveUser } from '../services/admin';

const AuthContext = createContext();
const googleProvider = new GoogleAuthProvider();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Sign up with email and password
    async function signup(email, password, displayName) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Update the user's display name
        await updateProfile(userCredential.user, { displayName });
        // Save user to Firestore (non-blocking)
        try {
            await saveUser({ ...userCredential.user, displayName });
        } catch (error) {
            console.error('Error saving user data:', error);
        }
        return userCredential;
    }

    // Sign in with email and password
    async function login(email, password) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // Save/update user in Firestore (non-blocking)
        try {
            await saveUser(userCredential.user);
        } catch (error) {
            console.error('Error saving user data:', error);
        }
        return userCredential;
    }

    // Sign in with Google
    async function signInWithGoogle() {
        const result = await signInWithPopup(auth, googleProvider);
        // Save/update user in Firestore (non-blocking, don't fail sign-in if this fails)
        try {
            await saveUser(result.user);
        } catch (error) {
            console.error('Error saving user data:', error);
            // Don't throw - user is already authenticated
        }
        return result;
    }

    // Sign out
    function logout() {
        return signOut(auth);
    }

    // Reset password
    function resetPassword(email) {
        return sendPasswordResetEmail(auth, email);
    }

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        signup,
        login,
        logout,
        resetPassword,
        signInWithGoogle
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
