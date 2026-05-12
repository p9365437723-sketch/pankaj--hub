"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Clock, Book, BookOpen, HelpCircle, Zap, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function GlobalSearch({ onClose }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      const searchLower = searchTerm.toLowerCase();
      const allResults = {
        chapters: [],
        subjects: [],
        categories: [],
        terms: [],
      };

      // Search chapters
      const chaptersSnap = await getDocs(collection(db, "chapters"));
      chaptersSnap.docs.forEach((doc) => {
        const data = doc.data();
        if ((data.name || "").toLowerCase().includes(searchLower)) {
          allResults.chapters.push({
            id: doc.id,
            title: data.name,
            type: "chapter",
            subjectId: data.subjectId,
            categoryId: data.categoryId,
          });
        }
      });

      // Search subjects
      const subjectsSnap = await getDocs(collection(db, "subjects"));
      subjectsSnap.docs.forEach((doc) => {
        const data = doc.data();
        if ((data.name || "").toLowerCase().includes(searchLower)) {
          allResults.subjects.push({
            id: doc.id,
            title: data.name,
            type: "subject",
            categoryId: data.categoryId,
          });
        }
      });

      // Search categories
      const categoriesSnap = await getDocs(collection(db, "categories"));
      categoriesSnap.docs.forEach((doc) => {
        const data = doc.data();
        if ((data.name || "").toLowerCase().includes(searchLower)) {
          allResults.categories.push({
            id: doc.id,
            title: data.name,
            type: "category",
          });
        }
      });

      // Search in content (key terms)
      const contentSnap = await getDocs(collection(db, "content"));
      contentSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.keyTerms && Array.isArray(data.keyTerms)) {
          data.keyTerms.forEach((kt) => {
            if ((kt.term || "").toLowerCase().includes(searchLower)) {
              allResults.terms.push({
                id: doc.id,
                title: kt.term,
                definition: kt.def,
                chapterId: data.chapterId,
                type: "term",
              });
            }
          });
        }
      });

      setResults(allResults);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result) => {
    if (result.type === "chapter") {
      router.push(`/dashboard/chapter/${result.id}`);
    }
    if (onClose) onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    } else if (e.key === "Escape") {
      if (onClose) onClose();
    }
  };

  const totalResults = results
    ? results.chapters.length + results.subjects.length + results.categories.length + results.terms.length
    : 0;

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search chapters, topics, terms..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full pl-12 pr-12 py-4 rounded-xl border border-white/20 bg-gray-900/90 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-lg"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Results Panel */}
      <div className="mt-3 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl max-h-[500px] overflow-y-auto">
        {loading && (
          <div className="p-8 text-center text-gray-400">
            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-2" />
            Searching...
          </div>
        )}

        {!loading && results && (
          <div>
            {results.chapters.length > 0 && (
              <div className="border-b border-white/10">
                <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
                  Chapters ({results.chapters.length})
                </div>
                {results.chapters.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleResultClick(item)}
                    className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors"
                  >
                    <Book className="w-4 h-4 text-primary-400" />
                    <span className="text-white">{item.title}</span>
                  </button>
                ))}
              </div>
            )}

            {results.terms.length > 0 && (
              <div className="border-b border-white/10">
                <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
                  Key Terms ({results.terms.length})
                </div>
                {results.terms.slice(0, 5).map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleResultClick(item)}
                    className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors"
                  >
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="text-white">{item.title}</span>
                      <p className="text-xs text-gray-500 truncate">{item.definition}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {results.subjects.length > 0 && (
              <div className="border-b border-white/10">
                <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
                  Subjects ({results.subjects.length})
                </div>
                {results.subjects.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleResultClick(item)}
                    className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors"
                  >
                    <Zap className="w-4 h-4 text-purple-400" />
                    <span className="text-white">{item.title}</span>
                  </button>
                ))}
              </div>
            )}

            {totalResults === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No results found for "{searchTerm}"</p>
              </div>
            )}
          </div>
        )}

        {!results && !loading && (
          <div className="p-8 text-center text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Start typing to search</p>
          </div>
        )}
      </div>
    </div>
  );
}