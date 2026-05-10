"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
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
  Sparkles,
  Loader,
} from "lucide-react";

export default function ContentEditor({ chapterId, categoryId, subjectId, onClose }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("notes");
  const [copied, setCopied] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [chapterDetails, setChapterDetails] = useState("");

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

  useEffect(() => {
    if (activeTab === "html" && content) {
      setHtmlCode(content.htmlCode || "");
    }
  }, [activeTab, content]);

  // ============ IMPROVED HTML PARSER ============
  const parseHtmlToContent = (html) => {
    const newContent = { ...content };

    try {
      // Create a temporary container to parse HTML
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;

      console.log("🔍 Parsing HTML...", html);

      // Function to find sections by heading text
      const findSectionContent = (keywords) => {
        let foundText = "";
        const allHeadings = tempDiv.querySelectorAll("h2, h3, h4, h5");
        
        for (let heading of allHeadings) {
          const headingText = heading.textContent.toLowerCase();
          
          // Check if any keyword matches
          for (let keyword of (Array.isArray(keywords) ? keywords : [keywords])) {
            if (headingText.includes(keyword.toLowerCase())) {
              // Get all content until next heading
              let element = heading.nextElementSibling;
              while (element && !element.tagName.match(/^H[1-6]$/)) {
                foundText += element.outerHTML || element.textContent;
                element = element.nextElementSibling;
              }
              console.log(`✅ Found "${keyword}":`, foundText.substring(0, 100));
              return foundText.trim();
            }
          }
        }
        return "";
      };

      // ✅ FIX: More flexible parsing
      const notesContent = findSectionContent(["notes", "introduction", "content", "overview", "body", "explanation"]);
      if (notesContent) newContent.notes = notesContent;

      const summaryContent = findSectionContent(["summary", "brief", "abstract", "synopsis"]);
      if (summaryContent) newContent.summary = summaryContent;

      // Timeline extraction
      const timelineItems = [];
      tempDiv.querySelectorAll("[data-timeline] .timeline-item, .timeline-item, tr").forEach((item) => {
        const yearEl = item.querySelector("[data-year], .year, td:first-child");
        const eventEl = item.querySelector("[data-event], .event, td:last-child");
        
        if (yearEl && eventEl) {
          const year = yearEl.textContent.trim();
          const event = eventEl.textContent.trim();
          if (year && event && year !== event) {
            timelineItems.push({ year, event });
          }
        }
      });
      if (timelineItems.length > 0) {
        console.log("✅ Found timeline:", timelineItems);
        newContent.timeline = timelineItems;
      }

      // Q&A extraction - MORE FLEXIBLE
      const extractQA = (selector, field) => {
        const items = [];
        
        // Try data attribute first
        tempDiv.querySelectorAll(`[data-${field}] .${field}-item, .${field}-item`).forEach((item) => {
          const q = item.querySelector("[data-q], .question, strong:first-of-type, h4")?.textContent?.trim() || "";
          const a = item.querySelector("[data-a], .answer, p")?.textContent?.trim() || "";
          
          if (q && a && q !== a) {
            items.push({ q, a });
          }
        });

        // If not found, try parsing paragraphs
        if (items.length === 0) {
          const paragraphs = Array.from(tempDiv.querySelectorAll("p"));
          for (let i = 0; i < paragraphs.length; i += 2) {
            const q = paragraphs[i]?.textContent?.trim();
            const a = paragraphs[i + 1]?.textContent?.trim();
            
            if (q && a && (q.toLowerCase().includes("q") || q.includes("?"))) {
              items.push({ q, a });
            }
          }
        }

        return items;
      };

      const q1mItems = extractQA("q1m", "q1m");
      if (q1mItems.length > 0) {
        console.log("✅ Found 1 Mark Q&A:", q1mItems);
        newContent.q1m = q1mItems;
      }

      const q3mItems = extractQA("q3m", "q3m");
      if (q3mItems.length > 0) {
        console.log("✅ Found 3 Mark Q&A:", q3mItems);
        newContent.q3m = q3mItems;
      }

      const q5mItems = extractQA("q5m", "q5m");
      if (q5mItems.length > 0) {
        console.log("✅ Found 5 Mark Q&A:", q5mItems);
        newContent.q5m = q5mItems;
      }

      // Key Terms
      const keyTermsItems = [];
      tempDiv.querySelectorAll("[data-keyTerms] .keyTerms-item, .term-item, dt, dd").forEach((item, index) => {
        let term = item.querySelector("[data-term], .term, strong")?.textContent?.trim();
        let def = item.querySelector("[data-def], .definition, em")?.textContent?.trim();
        
        if (!def && item.nextElementSibling) {
          term = item.textContent.split(":")[0].trim();
          def = item.textContent.split(":")[1]?.trim() || item.nextElementSibling.textContent.trim();
        }
        
        if (term && def) {
          keyTermsItems.push({ term, def });
        }
      });
      if (keyTermsItems.length > 0) {
        console.log("✅ Found Key Terms:", keyTermsItems);
        newContent.keyTerms = keyTermsItems;
      }

      // Key People
      const keyPeopleItems = [];
      tempDiv.querySelectorAll("[data-keyPeople] .keyPeople-item").forEach((item) => {
        const name = item.querySelector("[data-term], .name")?.textContent?.trim() || "";
        const contribution = item.querySelector("[data-def], .contribution")?.textContent?.trim() || "";
        
        if (name && contribution) {
          keyPeopleItems.push({ term: name, def: contribution });
        }
      });
      if (keyPeopleItems.length > 0) {
        console.log("✅ Found Key People:", keyPeopleItems);
        newContent.keyPeople = keyPeopleItems;
      }

      // Quiz extraction
      const quizItems = [];
      tempDiv.querySelectorAll("[data-quiz] .quiz-item, .question-item, .quiz-question").forEach((item) => {
        const qText = item.querySelector("[data-question], .question-text, strong, h4")?.textContent?.trim() || "";
        const options = Array.from(item.querySelectorAll("[data-option], .option, li, label"))
          .map((o) => o.textContent.trim())
          .filter((o) => o && o.length > 0)
          .slice(0, 4);
        
        if (qText && options.length >= 2) {
          quizItems.push({
            q: qText,
            options: options,
            correctIndex: 0,
          });
        }
      });
      if (quizItems.length > 0) {
        console.log("✅ Found Quiz Items:", quizItems);
        newContent.quiz = quizItems;
      }

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
      
      const populatedFields = Object.keys(parsedContent).filter(
        (key) => 
          (Array.isArray(parsedContent[key]) && parsedContent[key].length > 0) ||
          (typeof parsedContent[key] === "string" && parsedContent[key].trim().length > 0)
      ).length;

      console.log("📊 Total fields populated:", populatedFields);
      
      if (populatedFields === 0) {
        toast.error("No content found. Check HTML structure.");
      } else {
        toast.success(`✅ HTML parsed! ${populatedFields} fields auto-populated.`);
        setActiveTab("notes");
      }
    } catch (error) {
      console.error("Error parsing HTML:", error);
      toast.error(`Failed to parse HTML: ${error.message}`);
    } finally {
      setParsing(false);
    }
  };

  // ============ AI TOOL - GENERATE WITH CLAUDE ============
  const handleAiGenerate = async () => {
    if (!chapterDetails.trim()) {
      toast.error("Please describe the chapter");
      return;
    }

    setAiLoading(true);
    try {
      // Call Claude API via your backend or directly
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
        throw new Error("Failed to generate content");
      }

      const data = await response.json();
      
      if (data.content) {
        setContent(data.content);
        setChapterDetails("");
        toast.success("✅ Content generated with AI!");
        setActiveTab("notes");
      }
    } catch (error) {
      console.error("AI generation error:", error);
      toast.error(`AI Error: ${error.message}`);
    } finally {
      setAiLoading(false);
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

      if (!docSnap.exists()) {
        updateData.chapterId = chapterId;
        updateData.categoryId = categoryId;
        updateData.subjectId = subjectId;
        updateData.createdAt = serverTimestamp();
      }

      await updateDoc(docRef, updateData).catch(async (error) => {
        if (error.code === "not-found") {
          const newData = {
            chapterId,
            categoryId,
            subjectId,
            [field]: value,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await updateDoc(docRef, newData);
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

      await updateDoc(docRef, updateData);
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
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
        h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; margin-top: 30px; }
        .timeline-item { margin: 10px 0; }
        .q1m-item, .q3m-item, .q5m-item { margin: 15px 0; }
        .question { font-weight: bold; color: #333; }
        .answer { color: #666; margin-top: 5px; }
    </style>
</head>
<body>

<h2>📜 Notes</h2>
<div data-field="notes">
<p>Write detailed notes here. Include main concepts, explanations, and examples.</p>
</div>

<h2>🧠 Summary</h2>
<div data-field="summary">
<p>A brief summary of the chapter in 2-3 paragraphs.</p>
</div>

<h2>📅 Timeline</h2>
<div data-timeline>
    <div class="timeline-item">
        <span class="year">1900</span>
        <span class="event">First important event in history</span>
    </div>
    <div class="timeline-item">
        <span class="year">1950</span>
        <span class="event">Another significant event</span>
    </div>
</div>

<h2>✏️ 1 Mark Questions</h2>
<div data-q1m>
    <div class="q1m-item">
        <div class="question">Q1. What is the definition of something?</div>
        <div class="answer">A1. It is defined as...</div>
    </div>
</div>

<h2>📝 3 Mark Questions</h2>
<div data-q3m>
    <div class="q3m-item">
        <div class="question">Q1. Explain the concept in detail.</div>
        <div class="answer">A1. Detailed explanation with multiple points...</div>
    </div>
</div>

<h2>📖 5 Mark Questions</h2>
<div data-q5m>
    <div class="q5m-item">
        <div class="question">Q1. Discuss the topic comprehensively.</div>
        <div class="answer">A1. Comprehensive answer with detailed analysis...</div>
    </div>
</div>

<h2>📚 Key Terms</h2>
<div data-keyTerms>
    <div class="keyTerms-item">
        <span class="term">Term Name</span>: <span class="definition">Its definition or meaning</span>
    </div>
</div>

<h2>👤 Key People</h2>
<div data-keyPeople>
    <div class="keyPeople-item">
        <span class="term">Person Name</span>: <span class="definition">Their contribution or achievement</span>
    </div>
</div>

<h2>❓ Quiz</h2>
<div data-quiz>
    <div class="quiz-item">
        <h4 class="question-text">Q1. Multiple choice question here?</h4>
        <ul>
            <li class="option">Option A</li>
            <li class="option">Option B (correct answer)</li>
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
            className={`px-3 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-primary-600 text-white shadow-lg"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* AI TOOL TAB */}
      {activeTab === "html" && (
        <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-purple-300">AI Content Generator</h3>
          </div>
          <p className="text-xs text-purple-300 mb-3">
            Describe your chapter and AI will generate all content automatically!
          </p>
          <textarea
            value={chapterDetails}
            onChange={(e) => setChapterDetails(e.target.value)}
            placeholder="E.g., Chapter on Photosynthesis covering the process, history, key scientists, timeline, and exam questions..."
            className="w-full bg-black/40 border border-purple-500/30 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm mb-3"
            rows={3}
          />
          <button
            onClick={handleAiGenerate}
            disabled={aiLoading || !chapterDetails.trim()}
            className="btn-primary flex items-center justify-center gap-2 w-full disabled:opacity-50"
          >
            {aiLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate with AI
              </>
            )}
          </button>
        </div>
      )}

      {/* HTML CODE EDITOR */}
      {activeTab === "html" && (
        <div className="flex-1 flex flex-col">
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-blue-400 mb-2">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              <strong>💡 Or paste HTML:</strong> Paste your HTML code and click "Parse HTML & Fill All"
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
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-all ${
                  !htmlPreview
                    ? "bg-primary-600 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                <Code className="w-4 h-4" /> Code
              </button>
              <button
                onClick={() => setHtmlPreview(true)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-all ${
                  htmlPreview
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

      {/* SAVE ALL BUTTON */}
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
