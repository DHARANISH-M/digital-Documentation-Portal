import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Admin email (hardcoded)
const ADMIN_EMAIL = 'dharanish0631@gmail.com';

// Check if user is admin
export function isAdmin(email) {
    return email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

// Users collection
const USERS_COLLECTION = 'users';

// Save or update user on login
export async function saveUser(user) {
    if (!user) return;

    const userRef = doc(db, USERS_COLLECTION, user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        // Create new user record
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0],
            photoURL: user.photoURL || null,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp()
        });
    } else {
        // Update last login
        await updateDoc(userRef, {
            lastLoginAt: serverTimestamp(),
            displayName: user.displayName || userSnap.data().displayName,
            photoURL: user.photoURL || userSnap.data().photoURL
        });
    }
}

// Get all users (admin only)
export async function getAllUsers() {
    const q = query(
        collection(db, USERS_COLLECTION),
        orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const users = [];

    querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
    });

    return users;
}

// Help Tickets collection
const TICKETS_COLLECTION = 'helpTickets';

// Create a help ticket
export async function createHelpTicket(ticketData) {
    const docRef = await addDoc(collection(db, TICKETS_COLLECTION), {
        ...ticketData,
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    return docRef.id;
}

// Get tickets for a user
export async function getUserTickets(userId) {
    const q = query(
        collection(db, TICKETS_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const tickets = [];

    querySnapshot.forEach((doc) => {
        tickets.push({ id: doc.id, ...doc.data() });
    });

    return tickets;
}

// Get all tickets (admin only)
export async function getAllTickets() {
    const q = query(
        collection(db, TICKETS_COLLECTION),
        orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const tickets = [];

    querySnapshot.forEach((doc) => {
        tickets.push({ id: doc.id, ...doc.data() });
    });

    return tickets;
}

// Update ticket status (admin only)
export async function updateTicket(ticketId, data) {
    const ticketRef = doc(db, TICKETS_COLLECTION, ticketId);
    await updateDoc(ticketRef, {
        ...data,
        updatedAt: serverTimestamp()
    });
}

// Resolve a ticket
export async function resolveTicket(ticketId, adminResponse) {
    const ticketRef = doc(db, TICKETS_COLLECTION, ticketId);
    await updateDoc(ticketRef, {
        status: 'resolved',
        adminResponse,
        resolvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
}

// Close a ticket
export async function closeTicket(ticketId) {
    const ticketRef = doc(db, TICKETS_COLLECTION, ticketId);
    await updateDoc(ticketRef, {
        status: 'closed',
        updatedAt: serverTimestamp()
    });
}
