// firebase-config.js

// Import Firebase App and Firestore functions from Firebase v9 (Modular) via CDN
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getFirestore, collection, getDocs, addDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDkbedWccvhnLdMBDnlVy9YLhky-rKYZtg",
  authDomain: "popix-mobile.firebaseapp.com",
  databaseURL: "https://popix-mobile-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "popix-mobile",
  storageBucket: "popix-mobile.appspot.com",
  messagingSenderId: "255908119305",
  appId: "1:255908119305:web:82e263b9e1e90f2e4a89d8",
  measurementId: "G-M38FTHPFGC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to Push Score
export async function pushScore(score) {
    try {
        const scoresCollection = collection(db, 'leaderboard');
        await addDoc(scoresCollection, score);
    } catch (error) {
        console.error('Error adding document: ', error);
        throw error;
    }
}

// Function to Get Leaderboard
export async function getLeaderboard(callback) {
    try {
        const scoresCollection = collection(db, 'leaderboard');
        const snapshot = await getDocs(scoresCollection);
        const entries = snapshot.docs.map(doc => doc.data());
        callback(entries);
    } catch (error) {
        console.error('Error getting documents: ', error);
        callback([]);
    }
}

// Export the db instance if needed elsewhere
export { db };
