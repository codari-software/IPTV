import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    function signup(email, password) {
        return createUserWithEmailAndPassword(auth, email, password);
    }

    function login(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    function logout() {
        return signOut(auth);
    }

    // Load user settings (IPTV credentials) from Firestore
    async function getUserSettings(uid) {
        try {
            const docRef = doc(db, 'users', uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data();
            }
            return null;
        } catch (error) {
            console.error("Error fetching user settings:", error);
            return null;
        }
    }

    // Save user settings
    async function updateUserSettings(data) {
        const user = auth.currentUser;
        if (!user) {
            console.error("Cannot save settings: No authenticated user");
            return;
        }
        try {
            const docRef = doc(db, 'users', user.uid);
            await setDoc(docRef, data, { merge: true });
            // Also update local storage immediately to keep them in sync
            if (data.credentials) {
                localStorage.setItem('iptv_credentials', JSON.stringify({
                    ...data.credentials,
                    server_info: data.server_info
                }));
            }
        } catch (error) {
            console.error("Error updating user settings:", error);
            throw error;
        }
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);
                // Pre-fetch settings and sync to localStorage
                try {
                    const docRef = doc(db, 'users', user.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();

                        // Sync Credentials
                        if (data.credentials) {
                            localStorage.setItem('iptv_credentials', JSON.stringify({
                                ...data.credentials,
                                server_info: data.server_info
                            }));
                        }

                        // Sync Watch History
                        if (data.watch_history) {
                            // We don't overwrite local history blindly, utilize header merge logic in useWatchHistory
                            // But if local is empty, we can populate it.
                            if (!localStorage.getItem('watch_history')) {
                                localStorage.setItem('watch_history', JSON.stringify(data.watch_history));
                            }
                        }

                        // Sync Favorites
                        if (data.favorites) {
                            localStorage.setItem('iptv_favorites', JSON.stringify(data.favorites));
                        }
                    }
                } catch (error) {
                    console.error("Auth Context: Failed to sync user settings", error);
                }
            } else {
                setCurrentUser(null);
                // Clear sensitive data on logout
                localStorage.removeItem('iptv_credentials');
                localStorage.removeItem('iptv_favorites');
                localStorage.removeItem('watch_history');
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        signup,
        login,
        logout,
        getUserSettings,
        updateUserSettings
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
