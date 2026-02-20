import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION_NAME = 'documents';

// Create a new document
export async function createDocument(documentData) {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...documentData,
        folderId: documentData.folderId || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    return docRef.id;
}

// Get all documents for a user
export async function getDocuments(userId) {
    const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    const documents = [];

    querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
    });

    // Sort client-side (newest first) to avoid needing a Firestore composite index
    documents.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
        const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
        return bTime - aTime;
    });

    return documents;
}

// Get documents by folder
export async function getDocumentsByFolder(userId, folderId) {
    const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId),
        where('folderId', '==', folderId)
    );

    const querySnapshot = await getDocs(q);
    const documents = [];

    querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
    });

    // Sort client-side (newest first)
    documents.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
    });

    return documents;
}

// Unfile all documents in a folder (set folderId to null)
export async function unfileDocumentsInFolder(folderId) {
    const q = query(
        collection(db, COLLECTION_NAME),
        where('folderId', '==', folderId)
    );
    const querySnapshot = await getDocs(q);
    const updates = [];
    querySnapshot.forEach((docSnap) => {
        updates.push(updateDoc(doc(db, COLLECTION_NAME, docSnap.id), { folderId: null, updatedAt: serverTimestamp() }));
    });
    await Promise.all(updates);
}

// Get a single document by ID
export async function getDocument(docId) {
    const docRef = doc(db, COLLECTION_NAME, docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
}

// Update a document
export async function updateDocument(docId, data) {
    const docRef = doc(db, COLLECTION_NAME, docId);
    await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
    });
}

// Delete a document
export async function deleteDocument(docId) {
    const docRef = doc(db, COLLECTION_NAME, docId);
    await deleteDoc(docRef);
}

// Rename a document
export async function renameDocument(docId, newName) {
    if (!newName || !newName.trim()) {
        throw new Error('Document name cannot be empty.');
    }
    const docRef = doc(db, COLLECTION_NAME, docId);
    await updateDoc(docRef, {
        name: newName.trim(),
        updatedAt: serverTimestamp()
    });
}

// Search documents by name or category
export async function searchDocuments(userId, searchQuery = '', category = '') {
    let q;

    if (category && category !== 'All') {
        q = query(
            collection(db, COLLECTION_NAME),
            where('userId', '==', userId),
            where('category', '==', category)
        );
    } else {
        q = query(
            collection(db, COLLECTION_NAME),
            where('userId', '==', userId)
        );
    }

    const querySnapshot = await getDocs(q);
    const documents = [];

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Client-side filtering for search query
        if (!searchQuery ||
            data.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            data.owner?.toLowerCase().includes(searchQuery.toLowerCase())) {
            documents.push({ id: doc.id, ...data });
        }
    });

    // Sort client-side (newest first)
    documents.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
        const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
        return bTime - aTime;
    });

    return documents;
}

// Get document statistics for dashboard
export async function getDocumentStats(userId) {
    const documents = await getDocuments(userId);

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
}
