import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore, collection } from "firebase/firestore";
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyBV2Q-_nJIcRHGUbhtwu8eKN9UAeaPvwQw",
    authDomain: "fir-authentication-8abb6.firebaseapp.com",
    projectId: "fir-authentication-8abb6",
    storageBucket: "fir-authentication-8abb6.appspot.com",
    messagingSenderId: "854259513422",
    appId: "1:854259513422:web:9a3d38f04501b643f0ab1f"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Use correct auth initialization based on platform
let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app); // Use standard web auth
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

export { auth };

export const db = getFirestore(app);
export const storage = getStorage(app);
export const usersRef = collection(db, 'users');
