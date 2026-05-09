"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        // Special check for hardcoded admin
        if (firebaseUser.email === "admin@pankajsir.com") {
          // We will use a mock email for admin if they use the special login
          setUser({ uid: "admin", role: "admin", email: "admin@pankajsir.com", name: "Admin" });
          setLoading(false);
          return;
        }

        // Check Firestore for user document
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.isBlocked) {
            await firebaseSignOut(auth);
            setUser(null);
            alert("Your account has been restricted by admin.");
          } else {
            // Update last login
            await setDoc(userDocRef, { lastLogin: new Date().toISOString() }, { merge: true });
            setUser({ uid: firebaseUser.uid, emailVerified: firebaseUser.emailVerified, ...userData });
          }
        } else {
          // For newly registered users or Google users who haven't got a doc yet
          const newUserData = {
            name: firebaseUser.displayName || "Student",
            email: firebaseUser.email,
            role: "student",
            provider: firebaseUser.providerData[0]?.providerId || "email",
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            isBlocked: false,
          };
          await setDoc(userDocRef, newUserData);
          setUser({ uid: firebaseUser.uid, emailVerified: firebaseUser.emailVerified, ...newUserData });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginAdmin = () => {
    // We simulate an admin login state since hardcoded admin isn't in Firebase auth
    const adminUser = { uid: "admin", role: "admin", email: "admin@pankajsir.com", name: "Admin" };
    setUser(adminUser);
    localStorage.setItem("adminAuth", "true");
    router.push("/admin");
  };

  const logout = async () => {
    if (user?.role === "admin") {
      localStorage.removeItem("adminAuth");
      setUser(null);
      router.push("/");
    } else {
      await firebaseSignOut(auth);
      setUser(null);
      router.push("/");
    }
  };

  // Restore admin session from local storage on reload if firebaseUser is null
  useEffect(() => {
    if (!user && !loading) {
      const isAdmin = localStorage.getItem("adminAuth");
      if (isAdmin) {
        setUser({ uid: "admin", role: "admin", email: "admin@pankajsir.com", name: "Admin" });
      }
    }
  }, [user, loading]);

  return (
    <AuthContext.Provider value={{ user, loading, loginAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
