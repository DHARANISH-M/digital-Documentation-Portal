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
    orderBy,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION_NAME = 'documents';

// Create a new document
export async function createDocument(documentData) {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...documentData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    return docRef.id;
}

// Get all documents for a user
export async function getDocuments(userId) {
    const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const documents = [];

    querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
    });

    return documents;
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

// Search documents by name or category
export async function searchDocuments(userId, searchQuery = '', category = '') {
    let q;

    if (category && category !== 'All') {
        q = query(
            collection(db, COLLECTION_NAME),
            where('userId', '==', userId),
            where('category', '==', category),
            orderBy('createdAt', 'desc')
        );
    } else {
        q = query(
            collection(db, COLLECTION_NAME),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
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
