// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAs10uGw1-TbEzTZ-SlXE-Fl3HeIzrQJRk",
  authDomain: "squotato.firebaseapp.com",
  projectId: "squotato",
  storageBucket: "squotato.firebasestorage.app",
  messagingSenderId: "465280140785",
  appId: "1:465280140785:web:99201408e4c3a6e646b050",
  measurementId: "G-M2LL10X0M7"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const messaging = firebase.messaging();
const auth = firebase.auth();

// Firebase collections
const quotesCollection = db.collection('quotes');
const feedbackCollection = db.collection('feedback');