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

                // Fallback/Migration for legacy key
                const legacy = localStorage.getItem('iptv_watch_history');
                if (legacy) {
                    console.log("Migrating legacy watch history...");
                    return JSON.parse(legacy);
                }
            } catch (e) {
                console.error("Error loading local history:", e);
            }
            return {};
        };

        if (currentUser) {
            // Authenticated: Sync with Firestore but Merge with Local
            if (!db) return;

            try {
                const unsub = onSnapshot(doc(db, "users", currentUser.uid), { includeMetadataChanges: true }, (docSnap) => {
                    let cloudData = {};
                    if (docSnap.exists() && docSnap.data().watch_history) {
                        cloudData = docSnap.data().watch_history;
                    }

                    // Smart Merge: Local vs Cloud
                    const localData = loadLocal();
                    const merged = { ...cloudData };

                    let needsCloudUpdate = false;
                    const updatesForCloud = {};
                    let hasChanges = false;

                    const pendingWrites = docSnap.metadata.hasPendingWrites;
                    console.log(`[WatchHistory] Syncing. PendingWrites: ${pendingWrites}, Cloud Items: ${Object.keys(cloudData).length}`);

                    Object.keys(localData).forEach(key => {
                        const localItem = localData[key];
                        const cloudItem = merged[key];

                        // Timestamps - Ensure numeric comparison
                        const localTime = Number(localItem.lastWatched || 0);
                        const cloudTime = Number(cloudItem?.lastWatched || 0);

                        // Check if Local is Newer
                        // If cloudData has pending writes, it ALREADY reflects our recent local change.
                        // So localTime == cloudTime usually.
                        if (!cloudItem || localTime > cloudTime) {
                            if (localTime > cloudTime) {
                                console.log(`[WatchHistory] Local newer for ${key}. Local: ${localTime}, Cloud: ${cloudTime}`);
                                needsCloudUpdate = true;
                                updatesForCloud[`watch_history.${key}`] = localItem;
                            } else if (!cloudItem) {
                                // Cloud missing this item entirely
                                needsCloudUpdate = true;
                                updatesForCloud[`watch_history.${key}`] = localItem;
                            }

                            merged[key] = localItem;
                            hasChanges = true;
                        }
                    });

                    if (Object.keys(merged).length > Object.keys(localData).length) {
                        hasChanges = true;
                    }

                    // Always Update State so user sees their progress immediately
                    setHistory(merged);
                    localStorage.setItem('watch_history', JSON.stringify(merged));

                    // Sync Back to Cloud
                    // Only push if we found newer local data AND we aren't already in a pending write state for this snapshot.
                    if (needsCloudUpdate && Object.keys(updatesForCloud).length > 0 && !pendingWrites) {
                        console.log("[WatchHistory] Pushing local updates to cloud:", Object.keys(updatesForCloud));
                        setDoc(doc(db, "users", currentUser.uid), updatesForCloud, { merge: true })
                            .catch(e => console.error("Auto-sync to cloud failed:", e));
                    }
                }, (error) => {
                    console.warn("Firestore sync error:", error.message);
                    setHistory(loadLocal());
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
