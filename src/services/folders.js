import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION_NAME = 'folders';

// Create a new folder
export async function createFolder(name, userId) {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        name,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    return docRef.id;
}

// Get all folders for a user
export async function getFolders(userId) {
    const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    const folders = [];

    querySnapshot.forEach((doc) => {
        folders.push({ id: doc.id, ...doc.data() });
    });

    // Sort client-side (newest first) to avoid needing a Firestore composite index
    folders.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
    });

    return folders;
}

// Rename a folder
export async function renameFolder(folderId, newName) {
    const docRef = doc(db, COLLECTION_NAME, folderId);
    await updateDoc(docRef, {
        name: newName,
        updatedAt: serverTimestamp()
    });
}

// Delete a folder (does NOT delete documents inside — they become unfiled)
export async function deleteFolder(folderId) {
    const docRef = doc(db, COLLECTION_NAME, folderId);
    await deleteDoc(docRef);
}
