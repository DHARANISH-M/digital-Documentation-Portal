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
import { hashPassword, verifyPassword } from './crypto';

const COLLECTION_NAME = 'folders';

// Minimum password length for protected folders
const MIN_PASSWORD_LENGTH = 6;

/**
 * Create a new folder (optionally password-protected)
 * @param {string} name - Folder name
 * @param {string} userId - Owner user ID
 * @param {boolean} isProtected - Whether the folder is password-protected
 * @param {string|null} folderPassword - Plain text password (only if isProtected)
 * @returns {Promise<string>} The new folder's document ID
 */
export async function createFolder(name, userId, isProtected = false, folderPassword = null) {
    // Validate password if folder is protected
    if (isProtected) {
        if (!folderPassword || folderPassword.length < MIN_PASSWORD_LENGTH) {
            throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
        }
    }

    const folderData = {
        name,
        userId,
        isProtected: !!isProtected,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    // Hash password before storing — NEVER store plain text
    if (isProtected && folderPassword) {
        folderData.folderPasswordHash = await hashPassword(folderPassword);
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), folderData);
    return docRef.id;
}

/**
 * Get all folders for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of folder objects
 */
export async function getFolders(userId) {
    const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    const folders = [];

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Never send password hash to the front-end listing
        folders.push({
            id: doc.id,
            name: data.name,
            userId: data.userId,
            isProtected: data.isProtected || false,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        });
    });

    // Sort client-side (newest first) to avoid needing a Firestore composite index
    folders.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
    });

    return folders;
}

/**
 * Get a single folder by ID (includes password hash for verification)
 * @param {string} folderId - Folder document ID
 * @returns {Promise<Object|null>} Folder object or null
 */
export async function getFolder(folderId) {
    const docRef = doc(db, COLLECTION_NAME, folderId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
}

/**
 * Verify password for a protected folder
 * @param {string} folderId - Folder document ID
 * @param {string} password - Plain text password to verify
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function verifyFolderPassword(folderId, password) {
    const folder = await getFolder(folderId);

    if (!folder) {
        return { success: false, message: 'Folder not found.' };
    }

    if (!folder.isProtected) {
        return { success: true, message: 'Folder is not protected.' };
    }

    if (!folder.folderPasswordHash) {
        return { success: false, message: 'Folder has no password set.' };
    }

    const isMatch = await verifyPassword(password, folder.folderPasswordHash);

    if (isMatch) {
        return { success: true, message: 'Password verified successfully.' };
    } else {
        return { success: false, message: 'Incorrect password. Please try again.' };
    }
}

/**
 * Update folder protection settings
 * @param {string} folderId - Folder document ID
 * @param {boolean} isProtected - Whether to enable protection
 * @param {string|null} newPassword - New password (only if enabling protection)
 */
export async function updateFolderProtection(folderId, isProtected, newPassword = null) {
    const docRef = doc(db, COLLECTION_NAME, folderId);

    const updateData = {
        isProtected: !!isProtected,
        updatedAt: serverTimestamp()
    };

    if (isProtected && newPassword) {
        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
        }
        updateData.folderPasswordHash = await hashPassword(newPassword);
    }

    // If removing protection, clear the password hash
    if (!isProtected) {
        updateData.folderPasswordHash = null;
    }

    await updateDoc(docRef, updateData);
}

/**
 * Rename a folder
 * @param {string} folderId - Folder document ID
 * @param {string} newName - New folder name
 */
export async function renameFolder(folderId, newName) {
    const docRef = doc(db, COLLECTION_NAME, folderId);
    await updateDoc(docRef, {
        name: newName,
        updatedAt: serverTimestamp()
    });
}

/**
 * Delete a folder (does NOT delete documents inside — they become unfiled)
 * @param {string} folderId - Folder document ID
 */
export async function deleteFolder(folderId) {
    const docRef = doc(db, COLLECTION_NAME, folderId);
    await deleteDoc(docRef);
}
