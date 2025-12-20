import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const useWatchHistory = () => {
    const [history, setHistory] = useState({});

    const getUserId = () => {
        const savedCreds = localStorage.getItem('iptv_credentials');
        if (!savedCreds) return null;
        const { username, url } = JSON.parse(savedCreds);
        // Normalize URL: remove protocol (http/https) and trailing slashes to ensure same ID across devices
        const normalizedUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const sanitizedUrl = normalizedUrl.replace(/[^a-zA-Z0-9]/g, '_');
        return `${username}_${sanitizedUrl}`;
    };

    useEffect(() => {
        // Load local first
        const stored = localStorage.getItem('iptv_watch_history');
        if (stored) {
            setHistory(JSON.parse(stored));
        }

        const userId = getUserId();
        if (!userId || !db) return;

        // Sync with Firestore
        try {
            const unsub = onSnapshot(doc(db, "users", userId), (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.watch_history) {
                        setHistory(data.watch_history);
                        localStorage.setItem('iptv_watch_history', JSON.stringify(data.watch_history));
                    }
                }
            }, (error) => {
                console.warn("Firestore sync error (History):", error.message);
            });
            return () => unsub();
        } catch (e) {
            console.warn("Firestore init error:", e);
        }
    }, []);

    const saveProgress = async (itemId, progressData) => {
        // progressData: { season, episode, timestamp, duration, lastWatched: Date.now() }
        const currentHistory = { ...history };

        const updatedEntry = { ...progressData, lastWatched: Date.now() };
        const updatedHistory = {
            ...currentHistory,
            [itemId]: updatedEntry
        };

        // Optimistic update
        setHistory(updatedHistory);
        localStorage.setItem('iptv_watch_history', JSON.stringify(updatedHistory));

        // Sync to cloud
        const userId = getUserId();
        if (userId && db) {
            try {
                // Nested object updates in Firestore can be tricky with 'merge', 
                // but for a map field 'watch_history', we usually want to update specific keys.
                // However, setDoc with { watch_history: updatedHistory } replaces the whole map
                // or we can use dot notation "watch_history.itemId" if we want atomic updates.
                // For simplicity/safety, let's write the whole map for this user (personal app).
                await setDoc(doc(db, "users", userId), { watch_history: updatedHistory }, { merge: true });
            } catch (e) {
                console.error("Error saving history to Firestore:", e);
            }
        }
    };

    const getProgress = (itemId) => {
        return history[itemId];
    };

    return { history, saveProgress, getProgress };
};

export default useWatchHistory;
