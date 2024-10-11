// firebase-config.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDkbedWccvhnLdMBDnlVy9YLhky-rKYZtg",
  authDomain: "popix-mobile.firebaseapp.com",
  projectId: "popix-mobile",
  storageBucket: "popix-mobile.appspot.com",
  messagingSenderId: "255908119305",
  appId: "1:255908119305:web:82e263b9e1e90f2e4a89d8",
  measurementId: "G-M38FTHPFGC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Sign in anonymously
signInAnonymously(auth)
    .then(() => {
        console.log('Signed in anonymously');
    })
    .catch((error) => {
        console.error('Anonymous sign-in failed:', error);
    });

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('User is signed in:', user.uid);
    } else {
        console.log('User is signed out');
    }
});

/**
 * Push a new score to the leaderboard
 * @param {number} level - The current level
 * @param {object} scoreData - The score data object
 * @returns {Promise}
 */
export function pushScore(level, scoreData) {
    const leaderboardRef = ref(database, `leaderboard/level${level}`);
    return push(leaderboardRef, scoreData);
}

/**
 * Get the leaderboard for a specific level
 * @param {number} level - The level to fetch
 * @param {function} callback - Callback function to handle the data
 */
export function getLeaderboard(level, callback) {
    const leaderboardRef = ref(database, `leaderboard/level${level}`);
    onValue(leaderboardRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const entries = Object.values(data);
            callback(entries);
        } else {
            callback([]);
        }
    });
}
