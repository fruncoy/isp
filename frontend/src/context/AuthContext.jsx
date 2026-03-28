import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          // Fetch user profile from Firestore
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
          } else {
            console.warn('User profile document does not exist in Firestore!');
          }
        } catch (err) {
          console.error("Error fetching user profile from Firestore:", err.message);
          // This often happens if Firestore Rules are not set to allow reads
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Admin signup (creates own account + Firestore profile)
  const adminSignup = async (email, password, name) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    try {
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        name,
        email,
        role: 'admin',
        status: 'active',
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to create user profile in Firestore:", err.message);
      throw new Error(`Auth succeeded but database failed: ${err.message}. Please check your Firebase Firestore rules!`);
    }
    
    // Force a refetch of the profile to ensure the state is synced before returning
    const docSnap = await getDoc(doc(db, 'users', cred.user.uid));
    if (docSnap.exists()) setUserProfile(docSnap.data());
    
    return cred;
  };

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    try {
      const docRef = doc(db, 'users', cred.user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      }
    } catch (err) {
      console.error("Error on login fetching profile:", err.message);
    }
    return cred;
  };

  const logout = () => signOut(auth);

  const value = {
    user,
    userProfile,
    setUserProfile,
    role: userProfile?.role || null,
    loading,
    login,
    logout,
    adminSignup,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
