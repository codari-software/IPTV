import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Replace the following with your app's Firebase project configuration
// You can find this in the Firebase Console -> Project Settings -> General -> Your apps
const firebaseConfig = {
    apiKey: "AIzaSyBNgdk0xnkiGrhzEQb-ixleicYNvo1isso",
    authDomain: "iptv-454bb.firebaseapp.com",
    projectId: "iptv-454bb",
    storageBucket: "iptv-454bb.firebasestorage.app",
    messagingSenderId: "759932618912",
    appId: "1:759932618912:web:d803b0f04f56bc73a321c5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
