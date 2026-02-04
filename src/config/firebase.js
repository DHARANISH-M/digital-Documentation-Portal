// Firebase Configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD7XbsGEAag1wJesqDeCDRqNqdS8UNom1Q",
    authDomain: "digital-documentation-portal.firebaseapp.com",
    projectId: "digital-documentation-portal",
    storageBucket: "digital-documentation-portal.firebasestorage.app",
    messagingSenderId: "55751552331",
    appId: "1:55751552331:web:9ce792722abaac7b870cce",
    measurementId: "G-14BWHRD0K2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

export default app;
