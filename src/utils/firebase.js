import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCGgHPL4x9ktL7AiZ0OWYunVUYjKR5EUww",
  authDomain: "signin-28fec.firebaseapp.com",
  projectId: "signin-28fec",
  storageBucket: "signin-28fec.firebasestorage.app",
  messagingSenderId: "818071688674",
  appId: "1:818071688674:web:bb2f8f9b1cd726beefd5bb",
  measurementId: "G-TTT7ZQ6H6D"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken();
  return {
    email: result.user.email,
    name: result.user.displayName || result.user.email.split('@')[0],
    avatarUrl: result.user.photoURL,
    idToken,
    uid: result.user.uid,
  };
};
