// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { initializeFirestore, getFirestore, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

// Initialize Firebase
console.log("Initializing Firebase with config:", firebaseConfig.projectId);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// Use initializeFirestore with long polling to avoid WebChannel 400s in some environments
initializeFirestore(app, { experimentalAutoDetectLongPolling: true, useFetchStreams: false });
const db = getFirestore(app);

console.log("Firebase initialized successfully");
console.log("Firestore instance created for project:", firebaseConfig.projectId);

// Global variables
let currentUser = null;
let userData = null;
let firestoreListeners = []; // Array to track active listeners

// DOM Elements - Initialize after DOM is ready
let userName, userEmail, userPhone, userCountry, userAvatar, mfaStatus, loginTime, sessionStatus, userId, emailVerified;

// Initialize DOM elements
function initializeDOMElements() {
    console.log('Initializing DOM elements...');
    
    userName = document.getElementById('userName');
    userEmail = document.getElementById('userEmail');
    userPhone = document.getElementById('userPhone');
    userCountry = document.getElementById('userCountry');
    userAvatar = document.getElementById('userAvatar');
    mfaStatus = document.getElementById('mfaStatus');
    loginTime = document.getElementById('loginTime');
    sessionStatus = document.getElementById('sessionStatus');
    userId = document.getElementById('userId');
    emailVerified = document.getElementById('emailVerified');
    
    // Log which elements were found
    console.log('DOM elements found:', {
        userName: !!userName,
        userEmail: !!userEmail,
        userPhone: !!userPhone,
        userCountry: !!userCountry,
        userAvatar: !!userAvatar,
        mfaStatus: !!mfaStatus,
        loginTime: !!loginTime,
        sessionStatus: !!sessionStatus,
        userId: !!userId,
        emailVerified: !!emailVerified
    });
    
    if (!userName || !userEmail || !userPhone || !userCountry || !userAvatar || !mfaStatus || !loginTime || !sessionStatus || !userId || !emailVerified) {
        console.warn('Some DOM elements not found - dashboard may not display correctly');
    }
}

// Firestore listener management
function startFirestoreListeners() {
    console.log("Starting Firestore listeners for UID:", auth.currentUser?.uid);
    
    if (!auth.currentUser) {
        console.warn("No authenticated user, Firestore listeners not started.");
        return;
    }
    
    // Check if the user's ID token is available
    auth.currentUser.getIdToken().then((token) => {
        console.log("User ID token available, length:", token.length);
    }).catch((error) => {
        console.error("Failed to get user ID token:", error);
    });
    
    console.log("User logged in:", auth.currentUser.uid);
    console.log("User email verified:", auth.currentUser.emailVerified);
    console.log("Auth state ready:", !!auth.currentUser);
    
    // Add a small delay to ensure authentication is fully established
    setTimeout(async () => {
        // First verify the user document exists before setting up listener
        try {
            console.log("Verifying user document exists: users/" + auth.currentUser.uid);
            const userDocRef = doc(db, 'users', auth.currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (!userDoc.exists()) {
                console.warn("User document does not exist, skipping real-time listener setup");
                // Document doesn't exist, just load initial data
                loadUserData();
                return;
            }
            
            console.log("User document exists, setting up real-time listener");
            
            // Add real-time listener for user data with enhanced error handling
            const userListener = onSnapshot(
                userDocRef, 
                (doc) => {
                    if (doc.exists()) {
                        console.log('User document updated in real-time:', doc.data());
                        userData = doc.data();
                        updateUserInterface();
                    } else {
                        console.warn('User document does not exist in real-time listener');
                    }
                }, 
                (error) => {
                    console.error('Error in user document listener:', error);
                    console.error('Error code:', error.code);
                    console.error('Error message:', error.message);
                    
                    // If permission denied or other auth issues, stop listeners
                    if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
                        console.warn('Authentication issue detected, stopping listeners and redirecting to login');
                        stopFirestoreListeners();
                        window.location.href = 'login.html';
                    } else {
                        // For other errors, fall back to manual data loading
                        console.log('Falling back to manual data loading due to listener error');
                        loadUserData();
                    }
                }
            );
            
            firestoreListeners.push(userListener);
            console.log("onSnapshot listener added successfully");
        } catch (error) {
            console.error('Failed to set up onSnapshot listener:', error);
            console.log('Falling back to manual data loading');
            loadUserData();
        }
    }, 500); // Wait 500ms for auth to settle
    console.log('Dashboard Firestore listeners started successfully');
}

function stopFirestoreListeners() {
    console.log('Stopping dashboard Firestore listeners...');
    firestoreListeners.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
            unsubscribe();
        }
    });
    firestoreListeners = [];
    console.log('Dashboard Firestore listeners stopped');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize DOM elements after DOM is ready
    initializeDOMElements();

    // Check authentication state
    onAuthStateChanged(auth, function(user) {
        if (user) {
            currentUser = user;
            console.log("User logged in:", user.uid);
            startFirestoreListeners();
            // Load initial user data
            loadUserData();
            updateAuthStatus();
        } else {
            console.log('User is signed out');
            // Stop Firestore listeners when user signs out
            stopFirestoreListeners();
            // Redirect to login if not authenticated
            window.location.href = 'login.html';
        }
    });
});

// Load user data from Firestore
async function loadUserData() {
    if (!auth.currentUser) {
        console.warn('loadUserData: No authenticated user - skipping Firestore operation');
        return;
    }
    
    // Ensure DOM elements are initialized
    if (!userName || !userEmail) {
        console.warn('loadUserData: DOM elements not initialized, calling initializeDOMElements');
        initializeDOMElements();
    }
    
    try {
        console.log('Loading user data from Firestore document: users/' + currentUser.uid);
        
        // Verify authentication state before proceeding
        const token = await auth.currentUser.getIdToken();
        console.log('User token available, length:', token.length);
        
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            userData = userDoc.data();
            console.log('User data loaded successfully from Firestore:', userData);
            updateUserInterface();
        } else {
            console.error('User document not found in Firestore for UID:', currentUser.uid);
            console.log('Creating default user data structure');
            // Create a default user data structure
            userData = {
                name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Unknown User',
                email: currentUser.email,
                phone: '-',
                country: '-',
                mfaEnabled: false
            };
            updateUserInterface();
            showError('User profile not found - using default data');
        }
    } catch (error) {
        console.error('Error loading user data from Firestore:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        // Create fallback user data
        userData = {
            name: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Unknown User',
            email: currentUser?.email || 'No email',
            phone: '-',
            country: '-',
            mfaEnabled: false
        };
        
        try {
            updateUserInterface();
        } catch (uiError) {
            console.error('Error updating UI with fallback data:', uiError);
        }
        
        showError('Failed to load user data - using fallback data');
    }
}

// Update user interface with user data
function updateUserInterface() {
    if (!userData) {
        console.warn('updateUserInterface: No user data available');
        return;
    }
    
    // Ensure DOM elements are initialized
    if (!userName || !userEmail) {
        console.warn('updateUserInterface: DOM elements not initialized, calling initializeDOMElements');
        initializeDOMElements();
    }
    
    try {
        // Update user information with null checks
        if (userName) userName.textContent = userData.name || 'Unknown User';
        if (userEmail) userEmail.textContent = currentUser?.email || userData.email || 'No email';
        if (userPhone) userPhone.textContent = userData.phone || '-';
        if (userCountry) userCountry.textContent = userData.country || '-';
        
        // Update user avatar with initials
        if (userAvatar) {
            const initials = userData.name ? userData.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
            userAvatar.innerHTML = initials;
        }
        
        // Update MFA status
        if (mfaStatus) {
            if (userData.mfaEnabled) {
                mfaStatus.innerHTML = '<span class="mfa-badge"><i class="fas fa-shield-alt"></i> MFA Enabled</span>';
            } else {
                mfaStatus.innerHTML = '<span class="text-muted"><i class="fas fa-shield-alt"></i> MFA Disabled</span>';
            }
        }
        
        // Update authentication status
        updateAuthStatus();
        
        // Update travel stats (placeholder data for now)
        updateTravelStats();
        
        console.log('User interface updated successfully');
    } catch (error) {
        console.error('Error updating user interface:', error);
        console.error('Error details:', error.message);
    }
}

// Update travel statistics
function updateTravelStats() {
    try {
        // These would normally come from Firestore, but for now we'll use placeholder data
        const totalTripsElement = document.getElementById('totalTrips');
        const totalGroupsElement = document.getElementById('totalGroups');
        const totalFriendsElement = document.getElementById('totalFriends');
        const totalSpentElement = document.getElementById('totalSpent');
        
        if (totalTripsElement) totalTripsElement.textContent = '0';
        if (totalGroupsElement) totalGroupsElement.textContent = '0';
        if (totalFriendsElement) totalFriendsElement.textContent = '0';
        if (totalSpentElement) totalSpentElement.textContent = '$0';
        
        console.log('Travel stats updated with placeholder data');
    } catch (error) {
        console.error('Error updating travel stats:', error);
    }
}

// Enhanced group travel planning functions
function createNewTrip() {
    console.log('Creating new trip...');
    // This would open a trip creation modal or navigate to trip creation page
    alert('🚀 Trip Creation Coming Soon!\n\nThis feature will include:\n• Destination selection with AI recommendations\n• Date coordination with calendar sync\n• Budget planning and cost splitting\n• Group invitation system\n• Real-time collaboration tools');
}

function joinGroup() {
    console.log('Joining group...');
    alert('👥 Group Joining Coming Soon!\n\nThis feature will include:\n• Browse available travel groups\n• Accept invitations from friends\n• View group details and members\n• Participate in group decisions\n• Real-time group chat');
}

function syncCalendar() {
    console.log('Syncing calendar...');
    alert('📅 Calendar Sync Coming Soon!\n\nThis feature will include:\n• Google Calendar integration\n• Apple Calendar integration\n• Microsoft Outlook integration\n• Automatic availability matching\n• Smart date suggestions');
}

function openMoneyPot() {
    console.log('Opening money pot...');
    alert('💰 Money Pot Coming Soon!\n\nThis feature will include:\n• Create shared payment pools\n• Automatic cost splitting\n• Secure payment processing\n• Expense tracking and reporting\n• Group financial management');
}

function createNewGroup() {
    console.log('Creating new group...');
    alert('👨‍👩‍👧‍👦 Group Creation Coming Soon!\n\nThis feature will include:\n• Create travel groups\n• Invite friends via email\n• Set group preferences\n• Choose group leader\n• Start collaborative planning');
}

// Update authentication status
function updateAuthStatus() {
    if (!currentUser) {
        console.warn('updateAuthStatus: No current user available');
        return;
    }
    
    try {
        // Update login time
        if (loginTime) {
            const loginTimestamp = new Date(currentUser.metadata.lastSignInTime);
            loginTime.textContent = loginTimestamp.toLocaleString();
        }
        
        // Update user ID
        if (userId) {
            userId.textContent = currentUser.uid;
        }
        
        // Update email verification status
        if (emailVerified) {
            if (currentUser.emailVerified) {
                emailVerified.innerHTML = '<span class="text-success"><i class="fas fa-check-circle"></i> Verified</span>';
            } else {
                emailVerified.innerHTML = '<span class="text-warning"><i class="fas fa-exclamation-triangle"></i> Not Verified</span>';
            }
        }
        
        // Session status is always active if we're here
        if (sessionStatus) {
            sessionStatus.innerHTML = '<span class="text-success"><i class="fas fa-circle"></i> Active</span>';
        }
        
        console.log('Authentication status updated successfully');
    } catch (error) {
        console.error('Error updating authentication status:', error);
        console.error('Error details:', error.message);
    }
}

// Logout function
function logout() {
    console.log('Dashboard: Logging out user...');
    // Stop Firestore listeners before signing out
    stopFirestoreListeners();
    
    signOut(auth).then(() => {
        console.log('Dashboard: User signed out successfully');
        window.location.href = 'login.html';
    }).catch((error) => {
        console.error('Dashboard: Logout error:', error);
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
    createNewTrip,
    joinGroup,
    syncCalendar,
    openMoneyPot,
    createNewGroup
};

// Override placeholder functions with real implementations
window.logout = logout;
window.openSettings = openSettings;
window.createNewTrip = createNewTrip;
window.joinGroup = joinGroup;
window.syncCalendar = syncCalendar;
window.openMoneyPot = openMoneyPot;
window.createNewGroup = createNewGroup; 