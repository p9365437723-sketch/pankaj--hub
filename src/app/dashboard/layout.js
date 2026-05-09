"use client";

import { StudentRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { LogOut, GraduationCap } from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({ children }) {
  const { logout, user } = useAuth();

  return (
    <StudentRoute>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Top Navbar */}
        <header className="glass-panel m-4 px-6 py-4 flex items-center justify-between sticky top-4 z-50">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <GraduationCap className="w-6 h-6 text-primary-400" />
            </div>
            <div className="font-bold text-xl text-white tracking-tight hidden md:block">
              Pankaj Sir <span className="text-primary-400">Study Hub</span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-white">{user?.name}</div>
              <div className="text-xs text-gray-400">{user?.email}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold uppercase">
              {user?.name?.charAt(0) || "S"}
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </StudentRoute>
  );
}
