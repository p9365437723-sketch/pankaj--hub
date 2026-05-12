"use client";
import { useState, useEffect } from "react";

import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { BookOpen, GraduationCap, Users, Shield, ArrowRight, Loader2, Search } from "lucide-react";
import Image from "next/image";
import GlobalSearch from "@/components/GlobalSearch";

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminId, setAdminId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  const { loginAdmin, user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
  if (user && !loading) {
    if (user.role === "admin") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
  }
}, [user, loading, router]);



  const handleAuth = async (e) => {
    e.preventDefault();
    setLoadingAction(true);
    try {
      if (isLogin) {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        if (!userCred.user.emailVerified) {
          toast.error("Please verify your email before logging in.");
          router.push("/verify");
          return;
        }
        toast.success("Welcome back!");
        router.push("/dashboard");
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        import("firebase/auth").then(({ sendEmailVerification }) => {
          sendEmailVerification(userCred.user);
        });
        toast.success("Account created! Please check your email to verify.");
        router.push("/verify");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoadingAction(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success("Signed in with Google!");
      router.push("/dashboard");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminId.trim() === "p936543773" && adminPassword.trim() === "9365437723") {
      toast.success("Admin login successful");
      loginAdmin(); // Context will handle routing
    } else {
      toast.error("Invalid Admin Credentials");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary-500/10 blur-[120px] pointer-events-none" />

      {/* Search Button - Top Right */}
      <button
        onClick={() => setShowSearch(true)}
        className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white/80 hover:bg-white/20 hover:text-white transition-all backdrop-blur-sm"
      >
        <Search className="w-4 h-4" />
        <span className="text-sm">Search</span>
      </button>

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm" onClick={() => setShowSearch(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl mx-4">
            <GlobalSearch onClose={() => setShowSearch(false)} />
          </div>
        </div>
      )}

      {/* Left side - Branding */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-16 z-10">
        <div className="max-w-xl text-center md:text-left">
          <div className="inline-flex items-center justify-center p-4 bg-white/5 rounded-2xl mb-8 shadow-2xl border border-white/10 backdrop-blur-md">
            <GraduationCap className="w-16 h-16 text-primary-400" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight text-white drop-shadow-lg">
            Pankaj Sir <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-emerald-200">Study Hub</span>
          </h1>
          <p className="text-lg md:text-xl text-emerald-100/80 mb-12 font-light leading-relaxed">
            Your premium gateway to SEBA excellence. Master your subjects with structured content, real-time quizzes, and expert notes.
          </p>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="glass-panel p-6 flex flex-col items-center md:items-start transition-transform hover:-translate-y-2 cursor-default">
              <BookOpen className="w-8 h-8 text-primary-400 mb-4" />
              <h3 className="font-semibold text-lg text-white">Rich Content</h3>
              <p className="text-sm text-emerald-100/60 mt-2 text-center md:text-left">Access notes, terms, and quizzes</p>
            </div>
            <div className="glass-panel p-6 flex flex-col items-center md:items-start transition-transform hover:-translate-y-2 cursor-default">
              <Users className="w-8 h-8 text-primary-400 mb-4" />
              <h3 className="font-semibold text-lg text-white">100% Free</h3>
              <p className="text-sm text-emerald-100/60 mt-2 text-center md:text-left">No hidden fees, accessible to all</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Forms */}
      <div className="flex-1 flex items-center justify-center p-8 z-10">
        <div className="glass-panel w-full max-w-md p-8 relative">
          
          {/* Form Tabs */}
          <div className="flex bg-black/20 rounded-lg p-1 mb-8">
            <button
              onClick={() => setIsAdminMode(false)}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${!isAdminMode ? 'bg-primary-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              Student Portal
            </button>
            <button
              onClick={() => setIsAdminMode(true)}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-2 ${isAdminMode ? 'bg-white/10 text-white shadow-md border border-white/10' : 'text-gray-400 hover:text-white'}`}
            >
              <Shield className="w-4 h-4" />
              Admin Access
            </button>
          </div>

          {isAdminMode ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-bold text-white mb-2">Admin Dashboard</h2>
              <p className="text-emerald-100/60 text-sm mb-6">Enter your authorized credentials to continue.</p>
              
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Admin ID</label>
                  <input
                    type="text"
                    required
                    value={adminId}
                    onChange={(e) => setAdminId(e.target.value)}
                    className="input-field"
                    placeholder="Enter Admin ID"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="input-field"
                    placeholder="••••••••"
                  />
                </div>
                <button type="submit" className="btn-primary w-full mt-4 flex justify-center items-center gap-2">
                  Access Portal <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-bold text-white mb-2">{isLogin ? "Welcome Back" : "Create Account"}</h2>
              <p className="text-emerald-100/60 text-sm mb-6">
                {isLogin ? "Sign in to access your study materials." : "Join us to access free premium study materials."}
              </p>

              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="student@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field"
                    placeholder="••••••••"
                  />
                </div>
                <button type="submit" disabled={loadingAction} className="btn-primary w-full mt-4 flex justify-center items-center gap-2">
                  {loadingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? "Sign In" : "Sign Up")}
                </button>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-transparent text-gray-400">Or continue with</span>
                  </div>
                </div>

                <button
                  onClick={handleGoogleSignIn}
                  disabled={loadingAction}
                  className="mt-6 w-full btn-secondary flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </button>
              </div>

              <div className="mt-8 text-center">
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-emerald-100/40 z-0 pointer-events-none">
        © 2026 Pankaj Digital Academy. Built for SEBA Excellence.
      </div>
    </div>
  );
}
