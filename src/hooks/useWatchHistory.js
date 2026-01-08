import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, deleteField } from 'firebase/firestore';
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
                    const migrationDeletes = {}; // To remove bad keys

                    if (docSnap.exists()) {
                        const data = docSnap.data();

                        // 1. Load Proper Map
                        if (data.watch_history) {
                            cloudData = { ...data.watch_history };
                        }

                        // 2. Scan for and Migrate Malformed "watch_history.ID" keys
                        Object.keys(data).forEach(k => {
                            if (k.startsWith('watch_history.')) {
                                const realId = k.replace('watch_history.', '');
                                if (realId) {
                                    // Found data in wrong place. Treat as cloud data.
                                    const badItem = data[k];
                                    const existingItem = cloudData[realId];

                                    const badTime = Number(badItem?.lastWatched || 0);
                                    const existingTime = Number(existingItem?.lastWatched || 0);

                                    // If bad key is fresher, take it
                                    if (badTime > existingTime) {
                                        cloudData[realId] = badItem;
                                    }

                                    // Schedule deletion of the bad key
                                    migrationDeletes[k] = deleteField();
                                }
                            }
                        });
                    }

                    // Smart Merge: Local vs Cloud
                    const localData = loadLocal();
                    const merged = { ...cloudData };

                    let needsCloudUpdate = false;
                    const updatesForCloud = {}; // { [id]: data } to be put into watch_history map

                    const pendingWrites = docSnap.metadata.hasPendingWrites;
                    console.log(`[WatchHistory] Syncing. PendingWrites: ${pendingWrites}, Cloud Items: ${Object.keys(cloudData).length}`);

                    // Check Local against Cloud
                    Object.keys(localData).forEach(key => {
                        const localItem = localData[key];
                        const cloudItem = merged[key];

                        // Timestamps - Ensure numeric comparison
                        const localTime = Number(localItem.lastWatched || 0);
                        const cloudTime = Number(cloudItem?.lastWatched || 0);

                        // If Local is Newer OR Cloud is Missing
                        if (!cloudItem || localTime > cloudTime) {
                            if (localTime > cloudTime || !cloudItem) {
                                // We need to update cloud
                                needsCloudUpdate = true;
                                updatesForCloud[key] = localItem;
                            }
                            merged[key] = localItem;
                        }
                    });

                    // If we found malformed keys, we MUST trigger an update to save them to the correct map location
                    if (Object.keys(migrationDeletes).length > 0) {
                        needsCloudUpdate = true;
                        // Force migration items to be written to map
                        Object.keys(migrationDeletes).forEach(k => {
                            const realId = k.replace('watch_history.', '');
                            // Ensure we write the value we decided was correct (from cloudData/merged)
                            if (merged[realId]) {
                                updatesForCloud[realId] = merged[realId];
                            }
                        });
                    }

                    // Always Update State
                    setHistory(merged);
                    localStorage.setItem('watch_history', JSON.stringify(merged));

                    // Sync Back to Cloud
                    if (needsCloudUpdate && !pendingWrites) {
                        // Construct the update payload
                        const finalUpdates = { ...migrationDeletes };

                        if (Object.keys(updatesForCloud).length > 0) {
                            // Merge updates into 'watch_history' map
                            finalUpdates.watch_history = updatesForCloud;
                        }

                        if (Object.keys(finalUpdates).length > 0) {
                            console.log("[WatchHistory] Pushing updates/migrations to cloud", Object.keys(finalUpdates));
                            setDoc(doc(db, "users", currentUser.uid), finalUpdates, { merge: true })
                                .catch(e => console.error("Auto-sync to cloud failed:", e));
                        }
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

            // ALWAYS Save to LocalStorage
            try {
                localStorage.setItem('watch_history', JSON.stringify(newHistory));
            } catch (e) {
                console.error("Local save failed:", e);
            }

            // Sync to Cloud if authenticated
            if (currentUser && db) {
                // Correct Structure: { watch_history: { [key]: val } }
                const firestoreUpdates = { watch_history: {} };
                Object.keys(updates).forEach(key => {
                    firestoreUpdates.watch_history[key] = updates[key];
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
