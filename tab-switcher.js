// Tab switching functionality - Available immediately for HTML onclick handlers
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
        document.querySelector('.auth-tab:nth-child(2)').classList.add('active');
    } else if (tabName === 'forgotPasswordForm') {
        document.getElementById('.auth-tab:nth-child(3)').classList.add('active');
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

// Make functions globally available
window.switchTab = switchTab;
window.clearErrors = clearErrors; 