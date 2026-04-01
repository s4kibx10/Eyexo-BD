import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Listen for profile changes
        const profileRef = doc(db, 'users', currentUser.uid);
        const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
          console.log("Profile snapshot received:", docSnap.exists() ? "exists" : "not exists");
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            console.log("Profile doc does not exist, checking for admin email:", currentUser.email);
            const defaultAdminEmail = "sadafahmad858@gmail.com";
            if (currentUser.email === defaultAdminEmail) {
              console.log("Creating default admin profile...");
              const newProfile: UserProfile = {
                uid: currentUser.uid,
                name: currentUser.displayName || "Admin",
                email: currentUser.email || "",
                role: 'admin',
                totalOrders: 0,
                lastLogin: new Date().toISOString(),
              };
              setDoc(profileRef, newProfile).catch(err => console.error("Error creating admin profile:", err));
              setProfile(newProfile);
            } else {
              setProfile(null);
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("Profile fetch error for UID:", currentUser.uid, "Error:", error);
          setLoading(false);
        });
        
        return () => unsubscribeProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
