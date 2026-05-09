"use client";

import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { sendEmailVerification, signOut } from "firebase/auth";
import { Mail, ArrowRight, RefreshCw, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

export default function VerifyEmailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  // If user is already verified, send them to dashboard
  if (!loading && user && user.emailVerified) {
    router.push("/dashboard");
    return null;
  }

  // If no user is logged in at all, go to home
  if (!loading && !user) {
    router.push("/");
    return null;
  }

  const handleResend = async () => {
    setResending(true);
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        toast.success("Verification email sent! Check your inbox.");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setResending(false);
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          toast.success("Email verified successfully!");
          window.location.reload(); // Force full reload to update context
        } else {
          toast.error("Email is still not verified. Please check your inbox.");
        }
      }
    } catch (error) {
      toast.error("Failed to check status.");
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background glowing effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary-500/10 blur-[120px] pointer-events-none" />

      <div className="glass-panel max-w-md w-full p-8 text-center relative z-10 animate-in fade-in slide-in-from-bottom-4">
        <div className="w-20 h-20 bg-primary-600/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary-500/30">
          <Mail className="w-10 h-10 text-primary-400" />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-2">Verify your email</h1>
        <p className="text-emerald-100/70 mb-8">
          We've sent an email to <span className="font-semibold text-white">{user?.email}</span>. 
          Please click the link inside to verify your account and access the study hub.
        </p>

        <div className="space-y-4">
          <button 
            onClick={handleCheck} 
            disabled={checking}
            className="btn-primary w-full py-3 flex justify-center items-center gap-2 text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            {checking ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
            I've verified my email
          </button>
          
          <button 
            onClick={handleResend} 
            disabled={resending}
            className="btn-secondary w-full py-3 flex justify-center items-center gap-2"
          >
            {resending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
            Resend Verification Email
          </button>

          <div className="pt-6 border-t border-white/10 mt-6">
            <button 
              onClick={handleLogout} 
              className="text-gray-400 hover:text-white flex items-center justify-center gap-2 mx-auto transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign out and try another account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
