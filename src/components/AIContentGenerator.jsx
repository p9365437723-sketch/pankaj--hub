// components/ContentEditor/AIContentGenerator.jsx
"use client";

import { useState } from "react";
import { Sparkles, Loader } from "lucide-react";
import toast from "react-hot-toast";

export default function AIContentGenerator({
  chapterId,
  categoryId,
  subjectId,
  onContentGenerated,
}) {
  const [chapterDetails, setChapterDetails] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!chapterDetails.trim()) {
      toast.error("Please describe the chapter");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterDetails,
          chapterId,
          categoryId,
          subjectId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Generation failed");
      }

      const data = await response.json();

      if (data.content) {
        onContentGenerated(data.content);
        setChapterDetails("");
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6">
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="font-bold text-purple-300">AI Content Generator</h3>
        </div>
        <p className="text-xs text-purple-200">
          Describe your chapter and AI will automatically generate:
          <br />
          📜 Notes • 🧠 Summary • 📅 Timeline • ✏️ Q&A • 📚 Key Terms •
          👤 Key People • ❓ Quiz
        </p>
      </div>

      <textarea
        value={chapterDetails}
        onChange={(e) => setChapterDetails(e.target.value)}
        placeholder={`Example:
Class: 10
Subject: Biology
Chapter: Photosynthesis

Topics to cover:
- Light reactions and dark reactions
- Role of chlorophyll
- Timeline of photosynthesis discovery (Priestley, Hill, Calvin, etc.)
- Key scientists and their contributions
- 1 mark, 3 mark, 5 mark questions for board exams
- Important terminology
- Multiple choice quiz questions`}
        className="flex-1 bg-black/40 border border-white/10 rounded-lg p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none font-mono text-sm mb-4"
      />

      <button
        onClick={handleGenerate}
        disabled={loading || !chapterDetails.trim()}
        className="btn-primary flex items-center justify-center gap-2 w-full disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            Generating... (this may take 10-15 seconds)
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Generate with AI
          </>
        )}
      </button>
    </div>
  );
}
