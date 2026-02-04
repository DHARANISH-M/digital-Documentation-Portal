# DocFlow - Digital Documentation Portal

A professional document management web application built with React and Firebase.

## Features

- 🔐 **Authentication** - Secure login/signup with Firebase Auth
- 📊 **Dashboard** - Overview with statistics and recent activity  
- 📤 **Upload Documents** - Drag-drop file upload to Firebase Storage
- 📁 **View Documents** - Grid view with category badges
- 🔍 **Search & Filter** - Find documents by name or category
- 👤 **Profile Management** - Edit user profile

## Tech Stack

- **Frontend**: React 18 + Vite
- **Authentication**: Firebase Auth (Email/Password + Google)
- **Database**: Cloud Firestore
- **Storage**: Cloudinary
- **Routing**: React Router v6

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or use existing
3. Enable **Authentication** → Email/Password + Google
4. Enable **Cloud Firestore**
5. Copy your config to `src/config/firebase.js`

### 3. Configure Cloudinary

1. Go to [Cloudinary Console](https://cloudinary.com/console)
2. Create a free account if you don't have one
3. Get your **Cloud Name** from the dashboard
4. Go to **Settings** → **Upload** → **Upload presets**
5. Create a new **unsigned** preset named `docflow_documents`
6. Update `src/config/cloudinary.js` with your cloud name:

```javascript
export const cloudinaryConfig = {
  cloudName: 'YOUR_CLOUD_NAME',
  uploadPreset: 'docflow_documents'
};
```

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Firestore Security Rules
Add these rules in Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /documents/{docId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
  }
}
```

### 4. Storage Security Rules
Add these rules in Firebase Console → Storage → Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /documents/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null 
        && request.auth.uid == userId;
    }
  }
}
```

### 5. Run Development Server
```bash
npm run dev
```

Open http://localhost:3000

## Project Structure

```
src/
├── components/     # Reusable UI components
├── config/         # Firebase configuration
├── context/        # React context (Auth)
├── pages/          # Page components
├── services/       # Firebase services
└── styles/         # CSS files
```

## License

MIT
