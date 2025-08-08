# The GC Project - Authentication System

A comprehensive authentication system built with Firebase Authentication, featuring user registration, login, MFA (Multi-Factor Authentication), and password reset functionality.

## Features

### ✅ User Authentication
- **Sign Up**: Create new accounts with email and password
- **Login**: Secure login with email and password
- **Password Reset**: Email-based password reset functionality
- **MFA Support**: Optional Multi-Factor Authentication using TOTP

### ✅ User Profile Management
- **Personal Details**: Name, contact number, country
- **Account Security**: MFA enable/disable
- **Profile Updates**: Modify account information

### ✅ Security Features
- **Firebase Authentication**: Industry-standard authentication
- **MFA/TOTP**: Time-based One-Time Password support
- **Secure Password Storage**: Firebase handles password hashing
- **Session Management**: Automatic token management

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Authentication**: Firebase Authentication
- **Database**: Firebase Firestore (for user profiles)
- **UI Framework**: Bootstrap 5
- **Icons**: Font Awesome 6
- **QR Code**: QRCode.js library

## Setup Instructions

### 1. Firebase Project Setup

1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project"
   - Enter project name (e.g., "The GC Project")
   - Follow the setup wizard

2. **Enable Authentication**:
   - In Firebase Console, go to "Authentication" → "Sign-in method"
   - Enable "Email/Password" provider
   - Optionally enable "Google" or other providers

3. **Create Firestore Database**:
   - Go to "Firestore Database" → "Create database"
   - Choose "Start in test mode" (for development)
   - Select a location close to your users

4. **Get Configuration**:
   - Go to "Project Settings" (gear icon)
   - Scroll down to "Your apps"
   - Click "Add app" → "Web"
   - Register your app and copy the configuration

### 2. Update Configuration

1. **Update Firebase Config**:
   - Open `firebase-config.js`
   - Replace the placeholder values with your Firebase project configuration:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
```

2. **Update auth.js**:
   - Open `auth.js`
   - Replace the firebaseConfig object with your actual configuration
   - Or import from `firebase-config.js`:

```javascript
// At the top of auth.js, replace the firebaseConfig with:
import { firebaseConfig } from './firebase-config.js';
```

### 3. Firestore Security Rules

Set up Firestore security rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 4. Local Development

1. **Serve the Application**:
   ```bash
   # Using Python (if available)
   python -m http.server 8000
   
   # Using Node.js (if available)
   npx http-server
   
   # Using PHP (if available)
   php -S localhost:8000
   ```

2. **Access the Application**:
   - Open `http://localhost:8000/login.html` in your browser

## Database Schema

### Users Collection
```javascript
{
  uid: "firebase-auth-uid",
  name: "John Doe",
  email: "john@example.com",
  phone: "+1234567890",
  country: "US",
  mfaEnabled: true,
  mfaSecret: "JBSWY3DPEHPK3PXP", // Only if MFA is enabled
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## API Endpoints (Firebase Functions)

For production, consider implementing these Firebase Functions:

### User Management
- `POST /api/users` - Create user profile
- `PUT /api/users/{uid}` - Update user profile
- `GET /api/users/{uid}` - Get user profile
- `DELETE /api/users/{uid}` - Delete user account

### MFA Management
- `POST /api/mfa/setup` - Setup MFA for user
- `POST /api/mfa/verify` - Verify MFA code
- `DELETE /api/mfa/disable` - Disable MFA

## Security Considerations

### Production Checklist
- [ ] Set up proper Firestore security rules
- [ ] Configure Firebase Authentication settings
- [ ] Set up email templates for password reset
- [ ] Implement proper CORS policies
- [ ] Use HTTPS in production
- [ ] Set up Firebase App Check
- [ ] Configure rate limiting
- [ ] Implement proper error handling

### MFA Implementation Notes
- The current MFA implementation uses a simplified TOTP verification
- For production, use a proper TOTP library like `otplib` or `speakeasy`
- Consider implementing backup codes for MFA recovery
- Store MFA secrets securely (encrypted at rest)

## File Structure

```
The-GC-Project/
├── login.html          # Main authentication page
├── auth.js             # Authentication logic
├── firebase-config.js  # Firebase configuration
├── README.md           # This file
└── dashboard.html      # (Future) User dashboard
```

## Usage Examples

### Basic Authentication Flow
1. User visits `/login.html`
2. Clicks "Sign Up" tab
3. Fills in personal details and password
4. Optionally enables MFA
5. Account is created and user can login

### MFA Setup Flow
1. User enables MFA during signup
2. QR code is generated and displayed
3. User scans QR code with authenticator app
4. User enters verification code
5. MFA is enabled for the account

### Password Reset Flow
1. User clicks "Forgot Password"
2. Enters email address
3. Firebase sends reset email
4. User clicks link in email
5. User sets new password

## Troubleshooting

### Common Issues

1. **Firebase not initialized**:
   - Check if Firebase config is correct
   - Ensure Firebase SDK is loaded before auth.js

2. **Authentication errors**:
   - Verify email/password authentication is enabled in Firebase Console
   - Check browser console for detailed error messages

3. **Firestore permission errors**:
   - Verify Firestore security rules
   - Ensure user is authenticated before accessing data

4. **MFA not working**:
   - Check if TOTP library is properly loaded
   - Verify QR code generation
   - Test with a proper authenticator app (Google Authenticator, Authy, etc.)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Check the Firebase documentation
- Review the browser console for error messages
- Ensure all dependencies are properly loaded
