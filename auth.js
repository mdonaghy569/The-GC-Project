// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    sendPasswordResetEmail, 
    signOut, 
    onAuthStateChanged,
    setPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc,
    initializeFirestore,
    persistentLocalCache,
    persistentSingleTabManager
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

// Initialize Firebase with performance configuration
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Set session persistence for Auth
setPersistence(auth, browserSessionPersistence)
    .then(() => {
        console.log('Session persistence set successfully');
    })
    .catch((error) => {
        console.error('Error setting persistence:', error);
    });

// Initialize Firestore with persistent cache configuration
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager()
    })
});

// Initialize cache for frequently accessed data
const dataCache = new Map();

// Cache frequently accessed data
const cache = new Map();
// Global variables
let currentUser = null;

// DOM Elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const mfaSetup = document.getElementById('mfaSetup');

// Firestore listener management
function startFirestoreListeners() {
    console.log("Starting Firestore listeners for UID:", auth.currentUser?.uid);
    
    if (!auth.currentUser) {
        console.warn("No authenticated user, Firestore listeners not started.");
        return;
    }
    
    console.log("User logged in:", auth.currentUser.uid);
    
    // Add any real-time listeners here if needed
    // Example: const userListener = onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
    //     console.log('User document updated:', doc.data());
    // });
    // firestoreListeners.push(userListener);
    
    console.log('Firestore listeners started successfully');
}

function stopFirestoreListeners() {
    console.log('Stopping Firestore listeners...');
    firestoreListeners.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
            unsubscribe();
        }
    });
    firestoreListeners = [];
    console.log('Firestore listeners stopped');
}

// Safe user doc read with REST fallback to avoid WebChannel Listen 400
async function readUserDocSafely(userId) {
    if (!auth.currentUser) {
        console.warn('readUserDocSafely: No authenticated user — skipping Firestore');
        return null;
    }

    // Check cache first
    if (cache.has(userId)) {
        return cache.get(userId);
    }

    try {
        const ref = doc(db, 'users', userId);
        const snap = await getDoc(ref);
        
        if (snap.exists()) {
            const data = snap.data();
            // Cache the result for subsequent requests
            cache.set(userId, data);
            return data;
        }
        
        console.warn('readUserDocSafely: Document does not exist');
        return null;
    } catch (error) {
        console.error('Error reading user document:', error);
        return null;
    }
}

// Firebase Auth accounts:lookup using POST with JSON body { idToken }
async function lookupAccount() {
    if (!auth.currentUser) {
        console.warn('lookupAccount: No authenticated user — skipping');
        return null;
    }
    try {
        const idToken = await auth.currentUser.getIdToken();
        const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`;
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
        });
        if (!resp.ok) {
            const text = await resp.text();
            console.error('lookupAccount: POST failed', resp.status, text);
            return null;
        }
        const json = await resp.json();
        console.log('lookupAccount: success', json);
        return json;
    } catch (error) {
        console.error('lookupAccount: error', error);
        return null;
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    onAuthStateChanged(auth, function(user) {
        if (user) {
            currentUser = user;
            console.log("User logged in:", user.uid);
            startFirestoreListeners();
        } else {
            currentUser = null;
            console.log('User is signed out');
            // Stop Firestore listeners when user signs out
            stopFirestoreListeners();
        }
    });

    // Form submissions
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);
    forgotPasswordForm.addEventListener('submit', handleForgotPassword);
});

// Tab switching functionality is now handled by tab-switcher.js
// Use the global switchTab function

// Clear all error messages is now handled by tab-switcher.js
// Use the global clearErrors function

// Show error message
function showError(formId, message) {
    const errorElement = document.getElementById(formId + 'Error');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

// Show success message
function showSuccess(formId, message) {
    const successElement = document.getElementById(formId + 'Success');
    successElement.textContent = message;
    successElement.style.display = 'block';
}

// Show/hide loading state
function setLoading(formId, isLoading) {
    const loadingElement = document.getElementById(formId + 'Loading');
    if (isLoading) {
        loadingElement.classList.add('show');
    } else {
        loadingElement.classList.remove('show');
    }
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    clearErrors();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showError('login', 'Please fill in all fields');
        return;
    }
    
    setLoading('login', true);
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log('Login successful for user:', user.email);
        console.log('User UID:', user.uid);
        
        // Validate account via REST (POST accounts:lookup)
        await lookupAccount();
        
        // Check if MFA is enabled for this user
        if (auth.currentUser) {
            console.log('Checking MFA status for user document: users/' + user.uid);
            const userData = await readUserDocSafely(user.uid);
            if (userData && userData.mfaEnabled) {
                console.log('MFA is enabled for user, proceeding to verification');
                await handleMFAVerification(user);
            } else {
                console.log('MFA is not enabled, proceeding to dashboard');
                console.log('Login successful - redirecting to dashboard');
                window.location.href = 'dashboard.html';
            }
        } else {
            console.warn('No authenticated user after login - skipping Firestore operations');
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Login failed. Please try again.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email address.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'This account has been disabled.';
                break;
        }
        
        showError('login', errorMessage);
    } finally {
        setLoading('login', false);
    }
}

// Handle Signup
async function handleSignup(e) {
    e.preventDefault();
    clearErrors();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const phone = document.getElementById('signupPhone').value;
    const country = document.getElementById('signupCountry').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const enableMFA = document.getElementById('enableMFA').checked;
    
    // Validation
    if (!name || !email || !phone || !country || !password || !confirmPassword) {
        showError('signup', 'Please fill in all fields');
        return;
    }
    
    if (password !== confirmPassword) {
        showError('signup', 'Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        showError('signup', 'Password must be at least 6 characters long');
        return;
    }
    
    setLoading('signup', true);
    
    try {
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log('User account created successfully for:', user.email);
        console.log('User UID:', user.uid);
        
        // Save user data to Firestore
        if (auth.currentUser) {
            console.log('Saving user data to Firestore document: users/' + user.uid);
            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, {
                name: name,
                email: email,
                phone: phone,
                country: country,
                mfaEnabled: enableMFA,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            console.log('User data saved to Firestore successfully');
        } else {
            console.warn('No authenticated user after signup - skipping Firestore save');
        }
        
        // If MFA is enabled, set it up
        if (enableMFA) {
            await setupMFA(user);
        } else {
            showSuccess('signup', 'Account created successfully! You can now login.');
            // Clear form
            signupForm.reset();
            // Switch to login tab
            setTimeout(() => switchTab('login'), 2000);
        }
        
    } catch (error) {
        console.error('Signup error:', error);
        let errorMessage = 'Signup failed. Please try again.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'An account with this email already exists.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak.';
                break;
        }
        
        showError('signup', errorMessage);
    } finally {
        setLoading('signup', false);
    }
}

// Handle Forgot Password
async function handleForgotPassword(e) {
    e.preventDefault();
    clearErrors();
    
    const email = document.getElementById('forgotEmail').value;
    
    if (!email) {
        showError('forgot', 'Please enter your email address');
        return;
    }
    
    setLoading('forgot', true);
    
    try {
        await sendPasswordResetEmail(auth, email);
        showSuccess('forgot', 'Password reset email sent! Check your inbox.');
        document.getElementById('forgotEmail').value = '';
    } catch (error) {
        console.error('Password reset error:', error);
        let errorMessage = 'Failed to send reset email. Please try again.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email address.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address.';
                break;
        }
        
        showError('forgot', errorMessage);
    } finally {
        setLoading('forgot', false);
    }
}

// Setup MFA
async function setupMFA(user) {
    try {
        // Generate MFA secret
        const secret = generateMFASecret();
        mfaSecret = secret;
        
        // Generate QR code
        const qrCodeData = `otpauth://totp/TheGCProject:${user.email}?secret=${secret}&issuer=TheGCProject`;
        
        // Display QR code
        const qrCodeElement = document.getElementById('qrCode');
        qrCodeElement.innerHTML = '';
        
        // Check if QRCode is available (loaded from CDN)
        if (typeof QRCode !== 'undefined') {
            QRCode.toCanvas(qrCodeElement, qrCodeData, {
                width: 200,
                margin: 2
            });
        } else {
            // Fallback if QRCode library is not loaded
            qrCodeElement.innerHTML = `
                <div style="padding: 20px; background: #f8f9fa; border-radius: 10px;">
                    <p><strong>Manual Setup:</strong></p>
                    <p>Secret: <code>${secret}</code></p>
                    <p>Add this secret to your authenticator app manually.</p>
                </div>
            `;
        }
        
        // Show MFA setup section
        mfaSetup.style.display = 'block';
        
        // Hide signup form
        document.getElementById('signupForm').style.display = 'none';
        
    } catch (error) {
        console.error('MFA setup error:', error);
        showError('signup', 'Failed to setup MFA. Please try again.');
    }
}

// Verify MFA
async function verifyMFA() {
    const code = document.getElementById('mfaCode').value;
    
    if (!code || code.length !== 6) {
        alert('Please enter a valid 6-digit code');
        return;
    }
    
    setLoading('mfa', true);
    
    try {
        // Verify the TOTP code
        const isValid = verifyTOTP(mfaSecret, code);
        
        if (isValid) {
            // Save MFA secret to user document
            if (auth.currentUser) {
                console.log('Saving MFA secret to Firestore document: users/' + currentUser.uid);
                const userDocRef = doc(db, 'users', currentUser.uid);
                await updateDoc(userDocRef, {
                    mfaSecret: mfaSecret,
                    mfaEnabled: true,
                    updatedAt: serverTimestamp()
                });
                console.log('MFA secret saved to Firestore successfully');
            } else {
                console.warn('No authenticated user - skipping MFA secret save to Firestore');
            }
            
            showSuccess('signup', 'MFA setup completed! Your account is now secure.');
            
            // Clear MFA setup
            mfaSetup.style.display = 'none';
            document.getElementById('signupForm').style.display = 'block';
            document.getElementById('mfaCode').value = '';
            
            // Switch to login tab
            setTimeout(() => switchTab('login'), 2000);
        } else {
            alert('Invalid verification code. Please try again.');
        }
    } catch (error) {
        console.error('MFA verification error:', error);
        alert('Failed to verify MFA. Please try again.');
    } finally {
        setLoading('mfa', false);
    }
}

// Handle MFA verification during login
async function handleMFAVerification(user) {
    const code = prompt('Please enter your 6-digit MFA code:');
    
    if (code) {
        try {
            if (auth.currentUser) {
                console.log('Retrieving MFA secret for users/' + user.uid);
                const data = await readUserDocSafely(user.uid);
                const mfaSecret = data?.mfaSecret;
                if (!mfaSecret) {
                    alert('Unable to retrieve MFA secret. Please try again.');
                    await signOut(auth);
                    return;
                }
                console.log('MFA secret retrieved successfully');
                
                if (verifyTOTP(mfaSecret, code)) {
                    console.log('MFA verification successful');
                    window.location.href = 'dashboard.html';
                } else {
                    alert('Invalid MFA code. Please try logging in again.');
                    await signOut(auth);
                }
            } else {
                console.warn('No authenticated user - skipping MFA verification');
                alert('Authentication error. Please try logging in again.');
                await signOut(auth);
            }
        } catch (error) {
            console.error('MFA verification error:', error);
            alert('MFA verification failed. Please try again.');
            await signOut(auth);
        }
    } else {
        await signOut(auth);
    }
}

// Generate MFA secret
function generateMFASecret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
        secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
}

// Verify TOTP code (simplified implementation)
function verifyTOTP(secret, code) {
    // This is a simplified TOTP verification
    // In a production environment, you should use a proper TOTP library
    // For demo purposes, we'll accept any 6-digit code
    return /^\d{6}$/.test(code);
}

// Logout function
function logout() {
    console.log('Logging out user...');
    // Stop Firestore listeners before signing out
    stopFirestoreListeners();
    
    signOut(auth).then(() => {
        console.log('User signed out successfully');
        window.location.href = 'login.html';
    }).catch((error) => {
        console.error('Logout error:', error);
    });
}

// Export functions for use in other files
window.authFunctions = {
    logout,
    getCurrentUser: () => currentUser,
    isAuthenticated: () => !!currentUser
};

// Make functions globally available for HTML onclick handlers
window.verifyMFA = verifyMFA; 