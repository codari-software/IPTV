import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore'; // Removed getDoc as it was unused in original snippet or handled by onSnapshot
import { useAuth } from '../contexts/AuthContext';

const useFavorites = (type) => {
    const { currentUser } = useAuth();
    const [favorites, setFavorites] = useState([]);

    useEffect(() => {
        if (!currentUser) return;
        if (!db) {
            console.error("Firebase Sync: Database not initialized.");
            return;
        }

        console.log(`Firebase Sync: Subscribing to updates for user ${currentUser.uid}`);

        const unsub = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.favorites) {
                    setFavorites(data.favorites);
                }
            }
        }, (error) => {
            console.warn("Firestore sync error (Favorites):", error.message);
        });

        return () => unsub();
    }, [currentUser]);

    const toggleFavorite = async (item) => {
        if (!currentUser) return;

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

        // Sync to Firestore
        if (db) {
            try {
                await setDoc(doc(db, "users", currentUser.uid), { favorites: newFavorites }, { merge: true });
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
