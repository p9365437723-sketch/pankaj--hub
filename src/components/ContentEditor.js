"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import toast from "react-hot-toast";
import {
  Save,
  Copy,
  Check,
  Code,
  Eye,
  AlertCircle,
  Trash2,
  Zap,
  Download,
} from "lucide-react";

export default function ContentEditor({ chapterId, categoryId, subjectId, onClose }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("notes");
  const [copied, setCopied] = useState(false);
  const [parsing, setParsing] = useState(false);

  // HTML Editor State
  const [htmlCode, setHtmlCode] = useState("");
  const [htmlPreview, setHtmlPreview] = useState(false);

  // Tab Configuration
  const tabs = [
    { id: "notes", label: "📜 Notes", field: "notes" },
    { id: "media", label: "📁 Media", field: "media" },
    { id: "summary", label: "🧠 Summary", field: "summary" },
    { id: "timeline", label: "📅 Timeline", field: "timeline" },
    { id: "q1m", label: "✏️ 1 Mark Qs", field: "q1m" },
    { id: "q3m", label: "📝 3 Mark Qs", field: "q3m" },
    { id: "q5m", label: "📖 5 Mark Qs", field: "q5m" },
    { id: "keyTerms", label: "📚 Key Terms", field: "keyTerms" },
    { id: "keyPeople", label: "👤 Key People", field: "keyPeople" },
    { id: "quiz", label: "❓ Quiz", field: "quiz" },
    { id: "html", label: "💻 HTML Code", field: "htmlCode" },
  ];

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const docRef = doc(db, "content", chapterId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setContent(docSnap.data());
        } else {
          setContent({
            chapterId,
            categoryId,
            subjectId,
          });
        }
      } catch (error) {
        console.error("Error fetching content:", error);
        toast.error("Failed to load content");
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [chapterId, categoryId, subjectId]);

  // Load HTML code when switching to HTML tab
  useEffect(() => {
    if (activeTab === "html" && content) {
      setHtmlCode(content.htmlCode || "");
    }
  }, [activeTab, content]);

  // ============ HTML PARSER FUNCTION ============
  const parseHtmlToContent = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const newContent = { ...content }; const fieldMappings = {
      notes: '[data-field="notes"]',
      summary: '[data-field="summary"]',
      media: '[data-field="media"]',
    };

    Object.entries(fieldMappings).forEach(([field, selector]) => {
      const element = doc.querySelector(selector);

      if (element) {
        newContent[field] = element.innerHTML.trim();
      }
    });

    try {
      // Helper function to extract text by heading or section
      const extractSectionByHeading = (heading) => {
        const headings = doc.querySelectorAll("h2, h3, h4");
        for (let h of headings) {
          if (h.textContent.toLowerCase().includes(heading.toLowerCase())) {
            let text = "";
            let element = h.nextElementSibling;
            while (element && !element.tagName.match(/^H[1-6]$/)) {
              text += element.outerHTML + "\n";
              element = element.nextElementSibling;
            }
            return text.trim();
          }
        }
        return null;
      };

      // Extract content based on common heading patterns
      const sections = {
        notes: ["notes", "introduction", "content", "body"],
        summary: ["summary", "overview", "brief"],
        timeline: ["timeline", "history", "chronology"],
        q1m: ["1 mark", "one mark", "short answer", "objective"],
        q3m: ["3 mark", "three mark", "medium answer"],
        q5m: ["5 mark", "five mark", "long answer", "essay"],
        keyTerms: ["key terms", "glossary", "definitions", "terms"],
        keyPeople: ["key people", "important people", "figures"],
        quiz: ["quiz", "questions"],
      };

      // Try to find and extract each section
      for (const [field, keywords] of Object.entries(sections)) {
        if (field === "quiz") {
          // Special handling for quiz - extract questions and options
          const quizItems = [];
          const questionDivs = doc.querySelectorAll("[data-quiz], .quiz-item, .question");

          if (questionDivs.length > 0) {
            questionDivs.forEach((qDiv) => {
              const qText = qDiv.querySelector("h4, .question-text")?.textContent || "";
              const options = Array.from(qDiv.querySelectorAll("li, .option, label"))
                .map((o) => o.textContent.trim())
                .filter((o) => o);

              if (qText && options.length > 0) {
                quizItems.push({
                  q: qText,
                  options: options,
                  correctIndex: 0,
                });
              }
            });
          }

          if (quizItems.length > 0) {
            newContent.quiz = quizItems;
          }
        } else if (field === "timeline") {
          // Special handling for timeline
          const timelineItems = [];
          const timelineDivs = doc.querySelectorAll("[data-timeline], .timeline-item");

          if (timelineDivs.length > 0) {
            timelineDivs.forEach((tDiv) => {
              const year = tDiv.querySelector("[data-year], .year")?.textContent?.trim() || "";
              const event = tDiv.querySelector("[data-event], .event")?.textContent?.trim() || "";

              if (year && event) {
                timelineItems.push({ year, event });
              }
            });
          }

          if (timelineItems.length > 0) {
            newContent.timeline = timelineItems;
          }
        } else if (field === "keyTerms" || field === "keyPeople") {
          // Special handling for terms/people
          const items = [];
          const itemDivs = doc.querySelectorAll(`[data-${field}], .${field}-item`);

          if (itemDivs.length > 0) {
            itemDivs.forEach((div) => {
              const term = div.querySelector("[data-term], .term")?.textContent?.trim() || "";
              const definition = div.querySelector("[data-def], .definition")?.textContent?.trim() || "";

              if (term && definition) {
                items.push({ term, def: definition });
              }
            });
          }

          if (items.length > 0) {
            newContent[field] = items;
          }
        } else if (field.startsWith("q")) {
          // Handle Q&A sections
          const qItems = [];
          const qDivs = doc.querySelectorAll(`[data-${field}], .${field}-item`);

          if (qDivs.length > 0) {
            qDivs.forEach((div) => {
              const q = div.querySelector("[data-q], .question")?.textContent?.trim() || "";
              const a = div.querySelector("[data-a], .answer")?.textContent?.trim() || "";

              if (q && a) {
                qItems.push({ q, a });
              }
            });
          }

          if (qItems.length > 0) {
            newContent[field] = qItems;
          }
        } else {
          // For simple text fields
          for (const keyword of keywords) {
            const extracted = extractSectionByHeading(keyword);
            if (extracted) {
              newContent[field] = extracted;
              break;
            }
          }
        }
      }

      // If no structured data found, try to extract all text as notes


      return newContent;
    } catch (error) {
      console.error("Error parsing HTML:", error);
      throw error;
    }
  };

  const handleHtmlParse = async () => {
    if (!htmlCode.trim()) {
      toast.error("Please paste HTML code first");
      return;
    }

    setParsing(true);
    try {
      const parsedContent = parseHtmlToContent(htmlCode);
      setContent(parsedContent);

      // Count how many fields were populated
      const populatedFields = Object.keys(parsedContent).filter(
        (key) => parsedContent[key] && parsedContent[key] !== content?.[key]
      ).length;

      toast.success(
        `✅ HTML parsed! ${populatedFields} fields auto-populated.`
      );

      // Switch to notes tab to see results
      setActiveTab("notes");
    } catch (error) {
      console.error("Error parsing HTML:", error);
      toast.error(`Failed to parse HTML: ${error.message}`);
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async (field, value) => {
    setSaving(true);
    try {
      const docRef = doc(db, "content", chapterId);
      const docSnap = await getDoc(docRef);

      const updateData = {
        [field]: value,
        updatedAt: serverTimestamp(),
      };

      // Add initial fields if creating new document
      if (!docSnap.exists()) {
        updateData.chapterId = chapterId;
        updateData.categoryId = categoryId;
        updateData.subjectId = subjectId;
        updateData.createdAt = serverTimestamp();
      }

      // Use set with merge to create if doesn't exist
      await setDoc(docRef, updateData, { merge: true }); (async (error) => {
        if (error.code === "not-found") {
          // Document doesn't exist, create it
          const newData = {
            chapterId,
            categoryId,
            subjectId,
            [field]: value,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(docRef, newData);
        } else {
          throw error;
        }
      });

      setContent((prev) => ({
        ...prev,
        [field]: value,
      }));

      toast.success("✅ Saved!");
    } catch (error) {
      console.error("Error saving content:", error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, "content", chapterId);
      const docSnap = await getDoc(docRef);

      const updateData = {
        ...content,
        updatedAt: serverTimestamp(),
      };

      if (!docSnap.exists()) {
        updateData.chapterId = chapterId;
        updateData.categoryId = categoryId;
        updateData.subjectId = subjectId;
        updateData.createdAt = serverTimestamp();
      }

      await setDoc(docRef, updateData, { merge: true });
      toast.success("✅ All content saved!");
    } catch (error) {
      console.error("Error saving all:", error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(htmlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied!");
  };

  const handleClearHtml = () => {
    if (confirm("Clear HTML code?")) {
      setHtmlCode("");
    }
  };

  const downloadHtmlTemplate = () => {
    const template = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .section { margin: 20px 0; }
        h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    </style>
</head>
<body>

<h2>📜 Notes</h2>
<div data-field="notes">
<p>Your detailed notes content here...</p>
</div>

<h2>🧠 Summary</h2>
<div data-field="summary">
<p>Brief summary of the chapter...</p>
</div>

<h2>📅 Timeline</h2>
<div data-timeline>
    <div class="timeline-item">
        <span class="year">1900</span>
        <span class="event">Important event</span>
    </div>
    <div class="timeline-item">
        <span class="year">1950</span>
        <span class="event">Another event</span>
    </div>
</div>

<h2>✏️ 1 Mark Questions</h2>
<div data-q1m>
    <div class="q1m-item">
        <div class="question">Q1. What is something?</div>
        <div class="answer">A. It is a concept that...</div>
    </div>
</div>

<h2>📝 3 Mark Questions</h2>
<div data-q3m>
    <div class="q3m-item">
        <div class="question">Q1. Explain in detail...</div>
        <div class="answer">Answer with explanation...</div>
    </div>
</div>

<h2>📖 5 Mark Questions</h2>
<div data-q5m>
    <div class="q5m-item">
        <div class="question">Q1. Discuss the concept...</div>
        <div class="answer">Detailed answer with multiple points...</div>
    </div>
</div>

<h2>📚 Key Terms</h2>
<div data-keyTerms>
    <div class="keyTerms-item">
        <span class="term">Term</span>: <span class="definition">Its definition</span>
    </div>
</div>

<h2>👤 Key People</h2>
<div data-keyPeople>
    <div class="keyPeople-item">
        <span class="term">Person Name</span>: <span class="definition">Their contribution</span>
    </div>
</div>

<h2>❓ Quiz</h2>
<div data-quiz>
    <div class="quiz-item">
        <h4 class="question-text">Q1. Multiple choice question?</h4>
        <ul>
            <li class="option">Option A</li>
            <li class="option">Option B (correct)</li>
            <li class="option">Option C</li>
            <li class="option">Option D</li>
        </ul>
    </div>
</div>

</body>
</html>`;

    const blob = new Blob([template], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${chapterId}_template.html`;
    a.click();
    toast.success("Template downloaded!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg font-semibold text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* TABS */}
      <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-white/10 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${activeTab === tab.id
              ? "bg-primary-600 text-white shadow-lg"
              : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* REGULAR TEXT FIELDS */}
      {activeTab !== "html" && activeTab !== "quiz" && activeTab !== "timeline" &&
        activeTab !== "q1m" && activeTab !== "q3m" && activeTab !== "q5m" &&
        activeTab !== "keyTerms" && activeTab !== "keyPeople" && (
          <div className="flex-1 flex flex-col">
            <textarea
              value={content?.[tabs.find((t) => t.id === activeTab)?.field] || ""}
              onChange={(e) =>
                setContent({
                  ...content,
                  [tabs.find((t) => t.id === activeTab)?.field]: e.target.value,
                })
              }
              placeholder={`Enter ${tabs.find((t) => t.id === activeTab)?.label} here...`}
              className="flex-1 bg-black/20 border border-white/10 rounded-lg p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
            <button
              onClick={() =>
                handleSave(
                  tabs.find((t) => t.id === activeTab)?.field,
                  content?.[tabs.find((t) => t.id === activeTab)?.field] || ""
                )
              }
              disabled={saving}
              className="mt-4 btn-primary flex items-center justify-center gap-2 w-full md:w-auto ml-auto"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        )}

      {/* HTML CODE TAB */}
      {activeTab === "html" && (
        <div className="flex-1 flex flex-col">
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-blue-400 mb-2">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              <strong>💡 Paste AI-generated HTML:</strong> Click "Parse HTML" to auto-fill all fields!
            </p>
            <button
              onClick={downloadHtmlTemplate}
              className="text-xs text-blue-300 hover:text-blue-200 mt-2 flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> Download HTML Template
            </button>
          </div>

          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => setHtmlPreview(false)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-all ${!htmlPreview
                  ? "bg-primary-600 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
              >
                <Code className="w-4 h-4" /> Code
              </button>
              <button
                onClick={() => setHtmlPreview(true)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-all ${htmlPreview
                  ? "bg-primary-600 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
              >
                <Eye className="w-4 h-4" /> Preview
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyHtml}
                disabled={!htmlCode.trim()}
                className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={handleClearHtml}
                disabled={!htmlCode.trim()}
                className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!htmlPreview ? (
            <textarea
              value={htmlCode}
              onChange={(e) => setHtmlCode(e.target.value)}
              placeholder="Paste your HTML code here..."
              className="flex-1 bg-black/40 border border-white/10 rounded-lg p-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none font-mono text-sm"
              spellCheck="false"
            />
          ) : (
            <div className="flex-1 bg-black/40 border border-white/10 rounded-lg p-4 overflow-auto">
              <div
                className="prose prose-invert max-w-none text-sm"
                dangerouslySetInnerHTML={{ __html: htmlCode }}
              />
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleHtmlParse}
              disabled={parsing || !htmlCode.trim()}
              className="btn-primary flex items-center justify-center gap-2 flex-1 disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              {parsing ? "Parsing..." : "Parse HTML & Fill All"}
            </button>
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* SAVE ALL BUTTON - Always visible */}
      {activeTab !== "html" && (
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="mt-4 btn-primary flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving All..." : "Save All Content"}
        </button>
      )}
    </div>
  );
}
