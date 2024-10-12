// firebase-config.js

// Import Firebase scripts
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js';
import { getDatabase, ref, push, onValue, query, limitToLast } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js';


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
const database = getDatabase(app);

// Function to push a new score to the database
export function pushScore(scoreData) {
    const scoresRef = ref(database, 'scores');
    return push(scoresRef, scoreData);
}

// Function to retrieve the leaderboard data
export function getLeaderboard(callback) {
    const scoresRef = ref(database, 'scores');
    const topScoresQuery = query(scoresRef, limitToLast(100)); // Adjust limit as needed

    onValue(topScoresQuery, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const entries = Object.values(data);
            callback(entries);
        } else {
            callback([]);
        }
    });
}
