// Firebase Configuration
// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA4KaDKhQnHWPoHMAUgx8X5C1vZhQTtcuI",
    authDomain: "the-gc-project.firebaseapp.com",
    projectId: "the-gc-project",
    storageBucket: "the-gc-project.firebasestorage.app",
    messagingSenderId: "165239110971",
    appId: "1:165239110971:web:8c5be8c564454900c8cb1e",
    measurementId: "G-E2CWRXZNYN"
};

// Export the configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = firebaseConfig;
} else {
    window.firebaseConfig = firebaseConfig;
} 