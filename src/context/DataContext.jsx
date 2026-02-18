import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getDocuments } from '../services/documents';
import { getFolders } from '../services/folders';

const DataContext = createContext();

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
        }
    }, [currentUser]);

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
    }, []);

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

        // Folders
        folders,
        foldersLoaded,
        foldersLoading,
        loadFolders,
        addFolderToCache,
        updateFolderInCache,
        removeFolderFromCache,
        unfileDocumentsInCache,

        // General
        refreshAll
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
}
