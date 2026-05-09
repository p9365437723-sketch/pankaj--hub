"use client";

import { AdminRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, BookOpen, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

export default function AdminLayout({ children }) {
  const { logout, user } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Content CMS", href: "/admin/content", icon: BookOpen },
  ];

  return (
    <AdminRoute>
      <div className="min-h-screen bg-background flex flex-col md:flex-row">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 glass-panel m-4 rounded-xl z-20">
          <div className="font-bold text-lg text-white">Admin Portal</div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white">
            {sidebarOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static inset-y-0 left-0 w-64 glass-panel m-4 flex flex-col transition-transform duration-300 z-10 p-6`}>
          <div className="text-2xl font-bold text-white mb-10 hidden md:block tracking-tight">
            Pankaj Sir <br/><span className="text-primary-400 text-lg font-medium">Admin Portal</span>
          </div>
          
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive 
                      ? 'bg-primary-600/30 text-primary-400 border border-primary-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-white/10 pt-6">
            <div className="flex items-center gap-3 px-4 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm">
                A
              </div>
              <div>
                <p className="text-sm text-white font-medium">Administrator</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 md:pl-0 h-screen overflow-y-auto">
          {children}
        </main>
      </div>
    </AdminRoute>
  );
}
