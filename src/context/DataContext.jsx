import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getDocuments } from '../services/documents';
import { getFolders } from '../services/folders';

const DataContext = createContext();

// 15-minute access window for protected folders (in milliseconds)
const FOLDER_ACCESS_DURATION = 15 * 60 * 1000;

export function useData() {
    return useContext(DataContext);
}

export function DataProvider({ children }) {
    const { currentUser } = useAuth();

    // Documents cache
    const [documents, setDocuments] = useState([]);
    const [documentsLoaded, setDocumentsLoaded] = useState(false);
    const [documentsLoading, setDocumentsLoading] = useState(false);
    const [documentsError, setDocumentsError] = useState('');

    // Folders cache
    const [folders, setFolders] = useState([]);
    const [foldersLoaded, setFoldersLoaded] = useState(false);
    const [foldersLoading, setFoldersLoading] = useState(false);

    // Folder access sessions — { folderId: grantedAtTimestamp }
    const [folderAccessSessions, setFolderAccessSessions] = useState({});

    // Refs to avoid stale closures in useCallback
    const documentsLoadedRef = useRef(false);
    const documentsLoadingRef = useRef(false);
    const foldersLoadedRef = useRef(false);
    const foldersLoadingRef = useRef(false);

    // Keep refs in sync with state
    useEffect(() => { documentsLoadedRef.current = documentsLoaded; }, [documentsLoaded]);
    useEffect(() => { documentsLoadingRef.current = documentsLoading; }, [documentsLoading]);
    useEffect(() => { foldersLoadedRef.current = foldersLoaded; }, [foldersLoaded]);
    useEffect(() => { foldersLoadingRef.current = foldersLoading; }, [foldersLoading]);

    // Track which user the cache belongs to
    const cachedUserId = useRef(null);

    // Reset cache when user changes
    useEffect(() => {
        if (!currentUser) {
            setDocuments([]);
            setDocumentsLoaded(false);
            documentsLoadedRef.current = false;
            setFolders([]);
            setFoldersLoaded(false);
            foldersLoadedRef.current = false;
            setFolderAccessSessions({});
            cachedUserId.current = null;
            return;
        }

        if (cachedUserId.current !== currentUser.uid) {
            cachedUserId.current = currentUser.uid;
            setDocuments([]);
            setDocumentsLoaded(false);
            documentsLoadedRef.current = false;
            setFolders([]);
            setFoldersLoaded(false);
            foldersLoadedRef.current = false;
            setFolderAccessSessions({});
        }
    }, [currentUser]);

    // Periodically clean up expired folder access sessions (every 60 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            setFolderAccessSessions(prev => {
                const now = Date.now();
                const updated = {};
                let changed = false;
                for (const [folderId, grantedAt] of Object.entries(prev)) {
                    if (now - grantedAt < FOLDER_ACCESS_DURATION) {
                        updated[folderId] = grantedAt;
                    } else {
                        changed = true;
                    }
                }
                return changed ? updated : prev;
            });
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    // --- Folder Access Session Helpers ---

    /**
     * Grant temporary access to a protected folder (15 minutes)
     */
    const grantFolderAccess = useCallback((folderId) => {
        setFolderAccessSessions(prev => ({
            ...prev,
            [folderId]: Date.now()
        }));
    }, []);

    /**
     * Check if a folder currently has an active access session
     * @returns {boolean}
     */
    const hasFolderAccess = useCallback((folderId) => {
        const grantedAt = folderAccessSessions[folderId];
        if (!grantedAt) return false;
        return (Date.now() - grantedAt) < FOLDER_ACCESS_DURATION;
    }, [folderAccessSessions]);

    /**
     * Revoke access to a specific folder
     */
    const revokeFolderAccess = useCallback((folderId) => {
        setFolderAccessSessions(prev => {
            const updated = { ...prev };
            delete updated[folderId];
            return updated;
        });
    }, []);

    /**
     * Get remaining access time in minutes for a folder
     * @returns {number|null} Minutes remaining, or null if no access
     */
    const getFolderAccessTimeRemaining = useCallback((folderId) => {
        const grantedAt = folderAccessSessions[folderId];
        if (!grantedAt) return null;
        const elapsed = Date.now() - grantedAt;
        const remaining = FOLDER_ACCESS_DURATION - elapsed;
        if (remaining <= 0) return null;
        return Math.ceil(remaining / 60000);
    }, [folderAccessSessions]);

    // Fetch documents (only if not already cached)
    const loadDocuments = useCallback(async (forceRefresh = false) => {
        if (!currentUser) return [];

        // Use refs to check state to avoid stale closure issues
        if (documentsLoadedRef.current && !forceRefresh) {
            return; // Already loaded, do nothing
        }

        if (documentsLoadingRef.current && !forceRefresh) {
            return; // Already loading
        }

        setDocumentsLoading(true);
        documentsLoadingRef.current = true;
        setDocumentsError('');
        try {
            const data = await getDocuments(currentUser.uid);
            setDocuments(data);
            setDocumentsLoaded(true);
            documentsLoadedRef.current = true;
            return data;
        } catch (error) {
            console.error('Error loading documents:', error);
            setDocumentsError(`Failed to load documents: ${error.message}`);
            return [];
        } finally {
            setDocumentsLoading(false);
            documentsLoadingRef.current = false;
        }
    }, [currentUser]);

    // Fetch folders (only if not already cached)
    const loadFolders = useCallback(async (forceRefresh = false) => {
        if (!currentUser) return [];

        if (foldersLoadedRef.current && !forceRefresh) {
            return;
        }

        if (foldersLoadingRef.current && !forceRefresh) {
            return;
        }

        setFoldersLoading(true);
        foldersLoadingRef.current = true;
        try {
            const data = await getFolders(currentUser.uid);
            setFolders(data);
            setFoldersLoaded(true);
            foldersLoadedRef.current = true;
            return data;
        } catch (error) {
            console.error('Error loading folders:', error);
            return [];
        } finally {
            setFoldersLoading(false);
            foldersLoadingRef.current = false;
        }
    }, [currentUser]);

    // --- Local cache update helpers (avoid re-fetching after mutations) ---

    const addDocumentToCache = useCallback((doc) => {
        setDocuments(prev => [doc, ...prev]);
        setDocumentsLoaded(true);
        documentsLoadedRef.current = true;
    }, []);

    const removeDocumentFromCache = useCallback((docId) => {
        setDocuments(prev => prev.filter(d => d.id !== docId));
    }, []);

    const updateDocumentInCache = useCallback((docId, updates) => {
        setDocuments(prev => prev.map(d => d.id === docId ? { ...d, ...updates } : d));
    }, []);

    const addFolderToCache = useCallback((folder) => {
        setFolders(prev => [folder, ...prev]);
        setFoldersLoaded(true);
        foldersLoadedRef.current = true;
    }, []);

    const updateFolderInCache = useCallback((folderId, updates) => {
        setFolders(prev => prev.map(f => f.id === folderId ? { ...f, ...updates } : f));
    }, []);

    const removeFolderFromCache = useCallback((folderId) => {
        setFolders(prev => prev.filter(f => f.id !== folderId));
        // Also revoke any access session for the deleted folder
        revokeFolderAccess(folderId);
    }, [revokeFolderAccess]);

    const unfileDocumentsInCache = useCallback((folderId) => {
        setDocuments(prev => prev.map(d => d.folderId === folderId ? { ...d, folderId: null } : d));
    }, []);

    const refreshAll = useCallback(async () => {
        await Promise.all([
            loadDocuments(true),
            loadFolders(true)
        ]);
    }, [loadDocuments, loadFolders]);

    const value = {
        // Documents
        documents,
        documentsLoaded,
        documentsLoading,
        documentsError,
        loadDocuments,
        addDocumentToCache,
        removeDocumentFromCache,
        updateDocumentInCache,

        // Folders
        folders,
        foldersLoaded,
        foldersLoading,
        loadFolders,
        addFolderToCache,
        updateFolderInCache,
        removeFolderFromCache,
        unfileDocumentsInCache,

        // Folder Access Sessions (password protection)
        grantFolderAccess,
        hasFolderAccess,
        revokeFolderAccess,
        getFolderAccessTimeRemaining,

        // General
        refreshAll
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
}
