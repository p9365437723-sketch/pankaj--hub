"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Users, BookOpen, Layers, Award } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    categories: 0,
    subjects: 0,
    chapters: 0
  });

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setStats(prev => ({ ...prev, users: snapshot.size }));
    });
    const unsubCategories = onSnapshot(collection(db, "categories"), (snapshot) => {
      setStats(prev => ({ ...prev, categories: snapshot.size }));
    });
    const unsubSubjects = onSnapshot(collection(db, "subjects"), (snapshot) => {
      setStats(prev => ({ ...prev, subjects: snapshot.size }));
    });
    const unsubChapters = onSnapshot(collection(db, "chapters"), (snapshot) => {
      setStats(prev => ({ ...prev, chapters: snapshot.size }));
    });

    return () => {
      unsubUsers();
      unsubCategories();
      unsubSubjects();
      unsubChapters();
    };
  }, []);

  const statCards = [
    { name: "Total Users", value: stats.users, icon: Users, color: "text-blue-400" },
    { name: "Total Categories", value: stats.categories, icon: Layers, color: "text-emerald-400" },
    { name: "Total Subjects", value: stats.subjects, icon: BookOpen, color: "text-purple-400" },
    { name: "Total Chapters", value: stats.chapters, icon: Award, color: "text-orange-400" },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h1>
      <p className="text-emerald-100/60 mb-8">Real-time statistics of Pankaj Sir Study Hub</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="glass-card p-6 flex items-center gap-4">
              <div className={`p-4 rounded-xl bg-white/5 border border-white/10 ${stat.color}`}>
                <Icon className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm text-gray-400 font-medium">{stat.name}</p>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-12 glass-panel p-8">
        <h2 className="text-xl font-bold text-white mb-4">Welcome back, Admin!</h2>
        <p className="text-emerald-100/70 max-w-2xl leading-relaxed">
          From this portal, you have full control over the Study Hub. You can manage student access, block unauthorized users, and dynamically update all academic content (Classes, Subjects, Chapters, Notes, Quizzes) which will instantly reflect on the students' apps without requiring a refresh.
        </p>
      </div>
    </div>
  );


}


