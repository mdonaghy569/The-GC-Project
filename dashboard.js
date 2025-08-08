// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global variables
let currentUser = null;
let userData = null;

// DOM Elements
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const userPhone = document.getElementById('userPhone');
const userCountry = document.getElementById('userCountry');
const userAvatar = document.getElementById('userAvatar');
const mfaStatus = document.getElementById('mfaStatus');
const loginTime = document.getElementById('loginTime');
const sessionStatus = document.getElementById('sessionStatus');
const userId = document.getElementById('userId');
const emailVerified = document.getElementById('emailVerified');

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication state
    auth.onAuthStateChanged(function(user) {
        if (user) {
            currentUser = user;
            loadUserData();
            updateAuthStatus();
        } else {
            // Redirect to login if not authenticated
            window.location.href = 'login.html';
        }
    });
});

// Load user data from Firestore
async function loadUserData() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        
        if (userDoc.exists) {
            userData = userDoc.data();
            updateUserInterface();
        } else {
            console.error('User document not found');
            showError('User profile not found');
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showError('Failed to load user data');
    }
}

// Update user interface with user data
function updateUserInterface() {
    if (!userData) return;
    
    // Update user information
    userName.textContent = userData.name || 'Unknown User';
    userEmail.textContent = currentUser.email;
    userPhone.textContent = userData.phone || '-';
    userCountry.textContent = userData.country || '-';
    
    // Update user avatar with initials
    const initials = userData.name ? userData.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
    userAvatar.innerHTML = initials;
    
    // Update MFA status
    if (userData.mfaEnabled) {
        mfaStatus.innerHTML = '<span class="mfa-badge"><i class="fas fa-shield-alt"></i> MFA Enabled</span>';
    } else {
        mfaStatus.innerHTML = '<span class="text-muted"><i class="fas fa-shield-alt"></i> MFA Disabled</span>';
    }
    
    // Update authentication status
    updateAuthStatus();
}

// Update authentication status
function updateAuthStatus() {
    if (!currentUser) return;
    
    // Update login time
    const loginTimestamp = new Date(currentUser.metadata.lastSignInTime);
    loginTime.textContent = loginTimestamp.toLocaleString();
    
    // Update user ID
    userId.textContent = currentUser.uid;
    
    // Update email verification status
    if (currentUser.emailVerified) {
        emailVerified.innerHTML = '<span class="text-success"><i class="fas fa-check-circle"></i> Verified</span>';
    } else {
        emailVerified.innerHTML = '<span class="text-warning"><i class="fas fa-exclamation-triangle"></i> Not Verified</span>';
    }
    
    // Session status is always active if we're here
    sessionStatus.innerHTML = '<span class="text-success"><i class="fas fa-circle"></i> Active</span>';
}

// Logout function
function logout() {
    auth.signOut().then(() => {
        console.log('User signed out');
        window.location.href = 'login.html';
    }).catch((error) => {
        console.error('Logout error:', error);
        showError('Failed to logout. Please try again.');
    });
}

// Open settings (placeholder function)
function openSettings() {
    alert('Settings functionality will be implemented in future updates.');
}

// Show error message
function showError(message) {
    // Create a simple alert for now
    alert('Error: ' + message);
}

// Refresh user data
function refreshUserData() {
    loadUserData();
}

// Update user profile (placeholder function)
function updateProfile() {
    alert('Profile update functionality will be implemented in future updates.');
}

// Export functions for use in other files
window.dashboardFunctions = {
    logout,
    refreshUserData,
    updateProfile,
    getCurrentUser: () => currentUser,
    getUserData: () => userData
}; 