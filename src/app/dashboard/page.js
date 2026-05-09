"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Layers, BookOpen, ChevronRight, PlayCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function DashboardHome() {
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);

  const [activeCategory, setActiveCategory] = useState(null);
  const [activeSubject, setActiveSubject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categories"), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => a.order - b.order));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!activeCategory) {
      setSubjects([]);
      return;
    }
    const unsub = onSnapshot(collection(db, "subjects"), (snapshot) => {
      setSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(s => s.categoryId === activeCategory.id)
        .sort((a,b) => a.order - b.order));
    });
    return () => unsub();
  }, [activeCategory]);

  useEffect(() => {
    if (!activeSubject) {
      setChapters([]);
      return;
    }
    const unsub = onSnapshot(collection(db, "chapters"), (snapshot) => {
      setChapters(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(c => c.subjectId === activeSubject.id)
        .sort((a,b) => a.order - b.order));
    });
    return () => unsub();
  }, [activeSubject]);

  if (loading) {
    return <div className="flex justify-center mt-20"><Loader2 className="w-10 h-10 animate-spin text-primary-500" /></div>;
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      {/* Header section */}
      <div className="glass-panel p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl" />
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 relative z-10">Start Learning Today</h1>
        <p className="text-emerald-100/70 max-w-2xl text-lg relative z-10">
          Select your class, pick a subject, and dive into our premium study materials carefully crafted for your success.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Categories Column */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" /> 1. Select Category
          </h2>
          <div className="grid gap-3">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat); setActiveSubject(null); }}
                className={`glass-card p-4 flex items-center justify-between text-left transition-all ${
                  activeCategory?.id === cat.id 
                    ? 'bg-primary-600/30 border-primary-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                    : ''
                }`}
              >
                <span className="font-semibold text-lg text-white">{cat.name}</span>
                <ChevronRight className={`w-5 h-5 ${activeCategory?.id === cat.id ? 'text-primary-400' : 'text-gray-500'}`} />
              </button>
            ))}
            {categories.length === 0 && <p className="text-gray-500 italic">No categories available.</p>}
          </div>
        </div>

        {/* Subjects Column */}
        <div className="space-y-4">
          <h2 className={`text-xl font-semibold flex items-center gap-2 ${activeCategory ? 'text-white' : 'text-gray-600'}`}>
            <BookOpen className={`w-5 h-5 ${activeCategory ? 'text-purple-400' : 'text-gray-600'}`} /> 2. Select Subject
          </h2>
          {activeCategory ? (
            <div className="grid gap-3 animate-in fade-in slide-in-from-left-4">
              {subjects.map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setActiveSubject(sub)}
                  className={`glass-card p-4 flex items-center justify-between text-left transition-all ${
                    activeSubject?.id === sub.id 
                      ? 'bg-purple-600/30 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                      : ''
                  }`}
                >
                  <span className="font-semibold text-white">{sub.name}</span>
                  <ChevronRight className={`w-5 h-5 ${activeSubject?.id === sub.id ? 'text-purple-400' : 'text-gray-500'}`} />
                </button>
              ))}
              {subjects.length === 0 && <p className="text-gray-500 italic">No subjects available.</p>}
            </div>
          ) : (
            <div className="glass-panel p-6 text-center text-gray-500 border-dashed border-2 border-white/5">
              Select a category first
            </div>
          )}
        </div>

        {/* Chapters Column */}
        <div className="space-y-4">
          <h2 className={`text-xl font-semibold flex items-center gap-2 ${activeSubject ? 'text-white' : 'text-gray-600'}`}>
            <PlayCircle className={`w-5 h-5 ${activeSubject ? 'text-orange-400' : 'text-gray-600'}`} /> 3. Select Chapter
          </h2>
          {activeSubject ? (
            <div className="grid gap-3 animate-in fade-in slide-in-from-left-4">
              {chapters.map(chap => (
                <Link
                  key={chap.id}
                  href={`/dashboard/chapter/${chap.id}`}
                  className="glass-card p-4 flex items-center justify-between group hover:-translate-y-1"
                >
                  <span className="font-medium text-white group-hover:text-primary-400 transition-colors">{chap.name}</span>
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-primary-400 transition-colors" />
                </Link>
              ))}
              {chapters.length === 0 && <p className="text-gray-500 italic">No chapters available.</p>}
            </div>
          ) : (
            <div className="glass-panel p-6 text-center text-gray-500 border-dashed border-2 border-white/5">
              Select a subject first
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
