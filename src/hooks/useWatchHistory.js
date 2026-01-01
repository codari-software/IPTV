import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

const useWatchHistory = () => {
    const { currentUser } = useAuth();
    const [history, setHistory] = useState({});

    useEffect(() => {
        // Load initial local state to prevent flash of empty content
        const loadLocal = () => {
            try {
                const local = localStorage.getItem('watch_history');
                if (local) return JSON.parse(local);
            } catch (e) {
                console.error("Error loading local history:", e);
            }
            return {};
        };

        if (currentUser) {
            // Authenticated: Sync with Firestore but Merge with Local
            if (!db) return;

            try {
                const unsub = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
                    let cloudData = {};
                    if (docSnap.exists() && docSnap.data().watch_history) {
                        cloudData = docSnap.data().watch_history;
                    }

                    // Smart Merge: Local vs Cloud
                    const localData = loadLocal();
                    const merged = { ...cloudData };

                    Object.keys(localData).forEach(key => {
                        const localItem = localData[key];
                        const cloudItem = merged[key];
                        // If local is newer or cloud doesn't have it, keep local
                        if (!cloudItem || (localItem.lastWatched || 0) > (cloudItem.lastWatched || 0)) {
                            merged[key] = localItem;
                        }
                    });

                    setHistory(merged);
                }, (error) => {
                    console.warn("Firestore sync error:", error.message);
                    setHistory(loadLocal()); // Fallback to local on error
                });
                return () => unsub();
            } catch (e) {
                console.warn("Firestore init error:", e);
                setHistory(loadLocal());
            }
        } else {
            // Guest: LocalStorage Only
            setHistory(loadLocal());
        }
    }, [currentUser]);

    const saveProgress = async (itemIdOrUpdates, progressData = null) => {
        let updates = {};
        if (typeof itemIdOrUpdates === 'object' && itemIdOrUpdates !== null) {
            updates = itemIdOrUpdates;
        } else {
            updates = { [itemIdOrUpdates]: progressData };
        }

        // Add timestamps
        const now = Date.now();
        Object.keys(updates).forEach(key => {
            updates[key] = { ...updates[key], lastWatched: now };
        });

        // Optimistically update state
        setHistory(prevHistory => {
            const newHistory = { ...prevHistory, ...updates };

            // ALWAYS Save to LocalStorage (Act as persistent cache)
            try {
                localStorage.setItem('watch_history', JSON.stringify(newHistory));
            } catch (e) {
                console.error("Local save failed:", e);
            }

            // Sync to Cloud if authenticated
            if (currentUser && db) {
                const firestoreUpdates = {};
                Object.keys(updates).forEach(key => {
                    firestoreUpdates[`watch_history.${key}`] = updates[key];
                });

                setDoc(doc(db, "users", currentUser.uid), firestoreUpdates, { merge: true })
                    .catch(e => console.error("Cloud save failed:", e));
            }

            return newHistory;
        });
    };

    const getProgress = (itemId) => {
        return history[itemId];
    };

    return { history, saveProgress, getProgress };
};

export default useWatchHistory;
