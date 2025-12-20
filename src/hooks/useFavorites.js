import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

const useFavorites = (type) => {
    const [favorites, setFavorites] = useState(() => {
        try {
            const storedFavorites = localStorage.getItem('iptv_favorites');
            return storedFavorites ? JSON.parse(storedFavorites) : [];
        } catch (e) {
            console.error("Error parsing favorites", e);
            return [];
        }
    });

    const getUserId = () => {
        const savedCreds = localStorage.getItem('iptv_credentials');
        if (!savedCreds) return null;
        const { username, url } = JSON.parse(savedCreds);

        // Normalize URL: remove protocol (http/https) and trailing slashes to ensure same ID across devices
        const normalizedUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
        // Create safe ID: username + sanitized url
        const sanitizedUrl = normalizedUrl.replace(/[^a-zA-Z0-9]/g, '_');
        return `${username}_${sanitizedUrl}`;
    };

    useEffect(() => {
        const userId = getUserId();
        if (!userId) {
            console.warn("Firebase Sync: No User ID found (not logged in?)");
            return;
        }
        if (!db) {
            console.error("Firebase Sync: Database not initialized. Check firebase.js config.");
            return;
        }

        console.log(`Firebase Sync: Subscribing to updates for user ${userId}`);

        // Subscribe to Firestore changes
        try {
            const unsub = onSnapshot(doc(db, "users", userId), (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.favorites) {
                        setFavorites(data.favorites);
                        // Sync back to local storage
                        localStorage.setItem('iptv_favorites', JSON.stringify(data.favorites));
                    }
                }
            }, (error) => {
                // Ignore permission/config errors (user might not have set it up)
                console.warn("Firestore sync error (Favorites):", error.message);
            });

            return () => unsub();
        } catch (e) {
            console.warn("Firestore init error:", e);
        }
    }, []);

    const toggleFavorite = async (item) => {
        let newFavorites = [...favorites];
        const itemId = item.stream_id || item.series_id;
        const exists = newFavorites.find(f => (f.stream_id || f.series_id) === itemId);

        if (exists) {
            newFavorites = newFavorites.filter(f => (f.stream_id || f.series_id) !== itemId);
        } else {
            newFavorites.push({ ...item, type });
        }

        // Optimistic update
        setFavorites(newFavorites);
        localStorage.setItem('iptv_favorites', JSON.stringify(newFavorites));

        // Sync to Firestore
        const userId = getUserId();
        if (userId && db) {
            try {
                // setDoc with merge to avoid overwriting watch history
                await setDoc(doc(db, "users", userId), { favorites: newFavorites }, { merge: true });
            } catch (e) {
                console.error("Error saving favorites to Firestore:", e);
            }
        }
    };

    const isFavorite = (item) => {
        if (!item) return false;
        const itemId = item.stream_id || item.series_id;
        return favorites.some(f => (f.stream_id || f.series_id) === itemId);
    };

    const getFavoritesByType = () => {
        return favorites.filter(f => f.type === type);
    };

    return { favorites, toggleFavorite, isFavorite, getFavoritesByType };
};

export default useFavorites;
