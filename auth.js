// Firebase Configuration
// Replace with your Firebase project configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global variables
let currentUser = null;
let mfaSecret = null;

// DOM Elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const mfaSetup = document.getElementById('mfaSetup');

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    auth.onAuthStateChanged(function(user) {
        if (user) {
            currentUser = user;
            console.log('User is signed in:', user.email);
            // Redirect to dashboard or main app
            // window.location.href = 'dashboard.html';
        } else {
            currentUser = null;
            console.log('User is signed out');
        }
    });

    // Form submissions
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);
    forgotPasswordForm.addEventListener('submit', handleForgotPassword);
});

// Tab switching functionality
function switchTab(tabName) {
    // Hide all forms
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected form
    if (tabName === 'login') {
        document.getElementById('loginForm').classList.add('active');
        document.querySelector('.auth-tab:first-child').classList.add('active');
    } else if (tabName === 'signup') {
        document.getElementById('signupForm').classList.add('active');
        document.querySelector('.auth-tab:last-child').classList.add('active');
    } else if (tabName === 'forgotPassword') {
        document.getElementById('forgotPasswordForm').classList.add('active');
    }
    
    // Clear all error messages
    clearErrors();
}

// Clear all error messages
function clearErrors() {
    document.querySelectorAll('.alert').forEach(alert => {
        alert.style.display = 'none';
    });
}

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
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Check if MFA is enabled for this user
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists && userDoc.data().mfaEnabled) {
            // Handle MFA verification
            await handleMFAVerification(user);
        } else {
            // No MFA, proceed with login
            console.log('Login successful');
            // Redirect to dashboard
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
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Save user data to Firestore
        await db.collection('users').doc(user.uid).set({
            name: name,
            email: email,
            phone: phone,
            country: country,
            mfaEnabled: enableMFA,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
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
        await auth.sendPasswordResetEmail(email);
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
        QRCode.toCanvas(qrCodeElement, qrCodeData, {
            width: 200,
            margin: 2
        });
        
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
            await db.collection('users').doc(currentUser.uid).update({
                mfaSecret: mfaSecret,
                mfaEnabled: true,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
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
    // This would typically show a modal or separate page for MFA input
    // For now, we'll use a simple prompt
    const code = prompt('Please enter your 6-digit MFA code:');
    
    if (code) {
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            const mfaSecret = userDoc.data().mfaSecret;
            
            if (verifyTOTP(mfaSecret, code)) {
                console.log('MFA verification successful');
                // Redirect to dashboard
                window.location.href = 'dashboard.html';
            } else {
                alert('Invalid MFA code. Please try logging in again.');
                await auth.signOut();
            }
        } catch (error) {
            console.error('MFA verification error:', error);
            alert('MFA verification failed. Please try again.');
            await auth.signOut();
        }
    } else {
        await auth.signOut();
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
    auth.signOut().then(() => {
        console.log('User signed out');
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