// firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";


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

export function pushScore(scoreData) {
    return push(ref(database, 'leaderboard'), scoreData);
}

export function getLeaderboard(callback) {
    const leaderboardRef = ref(database, 'leaderboard');
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
