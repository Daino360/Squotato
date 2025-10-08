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

console.log('🚀 Initializing Firebase...');

try {
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  console.log('✅ Firebase initialized successfully!');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
}

// Initialize Firebase services
const db = firebase.firestore();
const auth = firebase.auth();

// Firebase collections
const quotesCollection = db.collection('quotes');
const feedbackCollection = db.collection('feedback');

console.log('📚 Firestore collections initialized');

// Test connections
quotesCollection.get().then((snapshot) => {
  console.log(`✅ Firestore connected! Found ${snapshot.size} quotes`);
}).catch((error) => {
  console.error('❌ Firestore connection failed:', error);
});

auth.onAuthStateChanged((user) => {
  if (user) {
    console.log('🔐 User is logged in:', user.email);
  } else {
    console.log('🔐 No user logged in');
  }
});

// Make variables globally available for debugging
window.firebase = firebase;
window.db = db;
window.auth = auth;
window.quotesCollection = quotesCollection;
window.feedbackCollection = feedbackCollection;