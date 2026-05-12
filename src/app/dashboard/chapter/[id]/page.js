"use client";

import { useState, useEffect, use } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Bookmark, BookmarkCheck, Search } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import GlobalSearch from "@/components/GlobalSearch";

export default function ChapterPage({ params }) {
  const unwrappedParams = use(params);
  const chapterId = unwrappedParams.id;

  const { user } = useAuth();

  const [chapter, setChapter] = useState(null);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("notes");
  const [showSearch, setShowSearch] = useState(false);

  // Quiz State
  const [quizScores, setQuizScores] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const chapDoc = await getDoc(doc(db, "chapters", chapterId));
        if (chapDoc.exists()) setChapter({ id: chapDoc.id, ...chapDoc.data() });

        const q = query(collection(db, "content"), where("chapterId", "==", chapterId));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setContent(snapshot.docs[0].data());
        } else {
          setContent({});
        }

        // Add to recently viewed if user is logged in
        if (user && user.uid !== "admin") {
          const userRef = doc(db, "users", user.uid);
          // Keep only last 10 recently viewed, but since we can't do that simply with arrayUnion,
          // we just append it for now. A cloud function or complex logic would limit it.
          await updateDoc(userRef, {
            recentlyViewed: arrayUnion(chapterId)
          }).catch(console.error);
        }

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [chapterId, user]);

  const tabs = [
    { id: "notes", label: "📜 Notes", data: content?.notes },
    { id: "summary", label: "🧠 Summary", data: content?.summary },
    { id: "timeline", label: "📅 Timeline", data: content?.timeline?.length > 0 },
    { id: "q1m", label: "✏️ 1 Mark Qs", data: content?.q1m?.length > 0 },
    { id: "q3m", label: "📝 3 Mark Qs", data: content?.q3m?.length > 0 },
    { id: "q5m", label: "📖 5 Mark Qs", data: content?.q5m?.length > 0 },
    { id: "keyTerms", label: "📚 Key Terms", data: content?.keyTerms?.length > 0 },
    { id: "keyPeople", label: "👤 Key People", data: content?.keyPeople?.length > 0 },
    { id: "quiz", label: "❓ Quiz", data: content?.quiz?.length > 0 },
  ];

  const handleQuizSelect = (qIndex, optIndex) => {
    if (quizSubmitted) return;
    setQuizScores(prev => ({ ...prev, [qIndex]: optIndex }));
  };

  const calculateScore = () => {
    let score = 0;
    content.quiz?.forEach((q, i) => {
      if (quizScores[i] === q.correctIndex) score++;
    });
    return score;
  };

  const handleSubmitQuiz = async () => {
    setQuizSubmitted(true);
    if (!user || user.uid === "admin") return;
    
    setSavingProgress(true);
    try {
      const score = calculateScore();
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        [`quizProgress.${chapterId}`]: score
      });
      toast.success("Quiz progress saved!");
    } catch (error) {
      console.error(error);
    } finally {
      setSavingProgress(false);
    }
  };

  const toggleBookmark = async () => {
    if (!user || user.uid === "admin") return;
    const userRef = doc(db, "users", user.uid);
    const isBookmarked = user.bookmarks?.includes(chapterId);
    
    try {
      await updateDoc(userRef, {
        bookmarks: isBookmarked ? arrayRemove(chapterId) : arrayUnion(chapterId)
      });
      toast.success(isBookmarked ? "Removed from bookmarks" : "Saved to bookmarks");
    } catch (error) {
      toast.error("Failed to update bookmark");
    }
  };

  const isBookmarked = user?.bookmarks?.includes(chapterId);

  if (loading) return <div className="flex justify-center mt-32"><Loader2 className="w-12 h-12 animate-spin text-primary-500" /></div>;
  if (!chapter) return <div className="text-center mt-32 text-white">Chapter not found</div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          {/* Search Button */}
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white/80 hover:bg-white/20 hover:text-white transition-all"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm">Search</span>
          </button>
        </div>
        {user && user.uid !== "admin" && (
          <button
            onClick={toggleBookmark}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${isBookmarked ? 'bg-primary-600/30 text-primary-400 border border-primary-500/30' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
          >
            {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            {isBookmarked ? "Saved" : "Save Chapter"}
          </button>
        )}
      </div>

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm" onClick={() => setShowSearch(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl mx-4">
            <GlobalSearch onClose={() => setShowSearch(false)} />
          </div>
        </div>
      )}
      
      <div className="glass-panel p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/20 rounded-full blur-3xl" />
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 relative z-10">{chapter.name}</h1>
        <p className="text-emerald-100/60 relative z-10">Master this chapter with our structured premium content.</p>
      </div>

      {/* Pill Tabs */}
      <div className="flex flex-wrap gap-3 mb-8">
        {tabs.filter(t => t.data).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? "pill-tab pill-tab-active" : "pill-tab pill-tab-inactive"}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Display */}
      <div className="glass-panel p-6 md:p-10 min-h-[400px]">
        {/* Render Image at the top of content if it exists and Notes/Summary tab is active */}
        {(activeTab === "notes" || activeTab === "summary") && content.imageUrl && (
          <div className="mb-8 rounded-xl overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
            <img src={content.imageUrl} alt="Chapter illustration" className="w-full max-h-[400px] object-cover" />
          </div>
        )}
        
        {/* Render PDF link at the top if it exists and Notes tab is active */}
        {activeTab === "notes" && content.pdfUrl && (
          <div className="mb-8 p-4 bg-primary-600/20 border border-primary-500/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg"><Bookmark className="w-6 h-6 text-orange-400" /></div>
              <div>
                <h4 className="text-white font-bold text-lg">Supplementary PDF Document</h4>
                <p className="text-emerald-100/60 text-sm">Download or view the official notes document.</p>
              </div>
            </div>
            <a href={content.pdfUrl} target="_blank" rel="noreferrer" className="btn-primary py-2 px-4">Open PDF</a>
          </div>
        )}

        {/* Text areas */}
        {(activeTab === "notes" || activeTab === "summary") && (
          <div className="prose prose-invert max-w-none text-emerald-50/90 whitespace-pre-wrap leading-relaxed font-sans text-lg">
            {content[activeTab] || `No ${activeTab} available for this chapter yet.`}
          </div>
        )}

        {/* Q&A Sections */}
        {["q1m", "q3m", "q5m"].includes(activeTab) && (
          <div className="space-y-6">
            {content[activeTab]?.map((item, i) => (
              <div key={i} className="glass-card p-6 border-l-4 border-l-primary-500">
                <h3 className="text-lg font-bold text-white mb-3 flex gap-3 items-start">
                  <span className="text-primary-400 font-mono text-sm mt-1">Q{i+1}.</span> 
                  {item.q}
                </h3>
                <div className="text-emerald-100/80 bg-black/20 p-4 rounded-lg">
                  {item.a}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Timeline */}
        {activeTab === "timeline" && (
          <div className="relative border-l border-primary-500/30 ml-3 space-y-8 py-4">
            {content.timeline?.map((item, i) => (
              <div key={i} className="relative pl-8">
                <div className="absolute w-4 h-4 bg-primary-500 rounded-full -left-[8.5px] top-1 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                <div className="glass-card p-4 inline-block min-w-[250px]">
                  <span className="text-primary-400 font-bold font-mono block mb-1">{item.year}</span>
                  <span className="text-white">{item.event}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Key Terms / Key People */}
        {(activeTab === "keyTerms" || activeTab === "keyPeople") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {content[activeTab]?.map((item, i) => (
              <div key={i} className="glass-card p-6 text-center md:text-left flex flex-col items-center md:items-start">
                <div className="w-12 h-12 rounded-full bg-primary-600/20 text-primary-400 flex items-center justify-center mb-4 border border-primary-500/30 text-xl font-bold">
                  {activeTab === 'keyTerms' ? 'T' : 'P'}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{item.term || item.name}</h3>
                <p className="text-emerald-100/70 text-sm">{item.def || item.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Quiz */}
        {activeTab === "quiz" && (
          <div className="max-w-3xl mx-auto space-y-8">
            {quizSubmitted && (
              <div className="glass-card p-6 bg-primary-600/20 border-primary-500/50 text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Quiz Results</h2>
                <p className="text-xl text-primary-300">You scored {calculateScore()} out of {content.quiz?.length}</p>
                <button onClick={() => { setQuizSubmitted(false); setQuizScores({}); }} className="mt-4 btn-secondary text-sm">Retake Quiz</button>
              </div>
            )}

            {content.quiz?.map((q, qIndex) => (
              <div key={qIndex} className="glass-card p-6 md:p-8">
                <h3 className="text-lg font-bold text-white mb-6 leading-relaxed">
                  <span className="text-primary-400 mr-2">{qIndex + 1}.</span> {q.q}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {q.options.map((opt, optIndex) => {
                    const isSelected = quizScores[qIndex] === optIndex;
                    const isCorrect = q.correctIndex === optIndex;
                    let optionStyle = "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10";
                    
                    if (quizSubmitted) {
                      if (isCorrect) optionStyle = "bg-emerald-600/30 border-emerald-500/50 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]";
                      else if (isSelected && !isCorrect) optionStyle = "bg-red-600/30 border-red-500/50 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]";
                      else optionStyle = "bg-white/5 border-white/10 text-gray-500 opacity-50";
                    } else if (isSelected) {
                      optionStyle = "bg-primary-600 border-primary-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]";
                    }

                    return (
                      <button
                        key={optIndex}
                        onClick={() => handleQuizSelect(qIndex, optIndex)}
                        className={`p-4 rounded-xl border text-left flex justify-between items-center transition-all ${optionStyle}`}
                      >
                        <span>{opt}</span>
                        {quizSubmitted && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                        {quizSubmitted && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {!quizSubmitted && content.quiz?.length > 0 && (
              <div className="text-center pt-6">
                <button 
                  onClick={handleSubmitQuiz} 
                  disabled={Object.keys(quizScores).length < content.quiz.length || savingProgress}
                  className="btn-primary px-8 py-3 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
                >
                  {savingProgress ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Quiz"}
                </button>
                {Object.keys(quizScores).length < content.quiz.length && (
                  <p className="text-sm text-gray-400 mt-3">Please answer all questions before submitting.</p>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
