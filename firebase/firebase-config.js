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

// Export database functions
export { database, ref, set, push, onValue, remove };
