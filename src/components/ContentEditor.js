"use client";

import { useState, useEffect } from "react";
import { useContentEditor } from "@/hooks/useContentEditor";
import { parseHtmlContent } from "@/lib/htmlParser";
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

const TABS = [
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

export default function ContentEditor({ chapterId, categoryId, subjectId, onClose }) {
  const [activeTab, setActiveTab] = useState("notes");
  const [copied, setCopied] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [chapterDetails, setChapterDetails] = useState("");
  const [htmlCode, setHtmlCode] = useState("");
  const [htmlPreview, setHtmlPreview] = useState(false);

  const {
    content,
    setContent,
    loading,
    saving,
    saveField,
    saveAll,
    updateLocalContent,
  } = useContentEditor(chapterId, categoryId, subjectId);

  useEffect(() => {
    if (activeTab === "html" && content) {
      setHtmlCode(content.htmlCode || "");
    }
  }, [activeTab, content]);

  const handleHtmlParse = async () => {
    if (!htmlCode.trim()) {
      toast.error("Please paste HTML code first");
      return;
    }

    setParsing(true);
    try {
      const parsedContent = parseHtmlContent(htmlCode);
      updateLocalContent(parsedContent);

      const populatedFields = Object.entries(parsedContent).filter(([_, v]) =>
        (Array.isArray(v) && v.length > 0) ||
        (typeof v === "string" && v.trim().length > 0)
      ).length;

      if (populatedFields === 0) {
        toast.error("No content found. Check HTML structure.");
      } else {
        toast.success(`Parsed! ${populatedFields} fields auto-populated.`);
        setActiveTab("notes");
      }
    } catch (error) {
      toast.error(`Failed to parse: ${error.message}`);
    } finally {
      setParsing(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!chapterDetails.trim()) {
      toast.error("Please describe the chapter");
      return;
    }

    const userRole = typeof window !== "undefined" ? localStorage.getItem("userRole") : null;
    if (userRole !== "admin") {
      toast.error("Admin access required for AI generation");
      return;
    }

    setAiLoading(true);
    try {
      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

      const response = await fetch("/api/generate-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId || "",
          "x-user-role": userRole || "",
        },
        body: JSON.stringify({
          chapterDetails,
          chapterId,
          categoryId,
          subjectId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate content");
      }

      const data = await response.json();

      if (data.content) {
        updateLocalContent(data.content);
        setChapterDetails("");
        toast.success("Content generated with AI!");
        setActiveTab("notes");
      }
    } catch (error) {
      toast.error(`AI Error: ${error.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async (field, value) => {
    await saveField(field, value);
  };

  const handleSaveAll = async () => {
    await saveAll(content);
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
    </style>
</head>
<body>
<h2>Notes</h2>
<p>Write detailed notes here.</p>
<h2>Summary</h2>
<p>A brief summary.</p>
<h2>Timeline</h2>
<div class="timeline-item"><strong>1900</strong>: Event</div>
<h2>1 Mark Questions</h2>
<div class="q1m-item"><div class="question">Q1. Question?</div><div class="answer">A1. Answer</div></div>
<h2>3 Mark Questions</h2>
<div class="q3m-item"><div class="question">Q1. Question?</div><div class="answer">A1. Answer</div></div>
<h2>Key Terms</h2>
<div class="keyTerms-item"><strong>Term</strong>: Definition</div>
<h2>Key People</h2>
<div class="keyPeople-item"><strong>Name</strong>: Contribution</div>
<h2>Quiz</h2>
<div class="quiz-item"><strong>Q1. Question?</strong><ul><li>Option A</li><li>Option B</li><li>Option C</li><li>Option D</li></ul></div>
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

  const currentTab = TABS.find((t) => t.id === activeTab);
  const isStructuredTab = ["timeline", "q1m", "q3m", "q5m", "keyTerms", "keyPeople", "quiz"].includes(activeTab);

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-white/10 overflow-x-auto">
        {TABS.map((tab) => (
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

      {activeTab === "html" && (
        <div className="flex-1 flex flex-col">
          <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-purple-300">AI Content Generator</h3>
            </div>
            <textarea
              value={chapterDetails}
              onChange={(e) => setChapterDetails(e.target.value)}
              placeholder="Describe chapter for AI generation..."
              className="w-full bg-black/40 border border-purple-500/30 rounded-lg p-3 text-white placeholder-gray-600 text-sm mb-3"
              rows={3}
            />
            <button
              onClick={handleAiGenerate}
              disabled={aiLoading || !chapterDetails.trim()}
              className="btn-primary flex items-center justify-center gap-2 w-full disabled:opacity-50"
            >
              {aiLoading ? <><Loader className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate with AI</>}
            </button>
          </div>

          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-blue-400">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              <strong>Or paste HTML:</strong> Click "Parse HTML & Fill All"
            </p>
            <button onClick={downloadHtmlTemplate} className="text-xs text-blue-300 hover:text-blue-200 mt-2">
              <Download className="w-3 h-3 inline mr-1" /> Download Template
            </button>
          </div>

          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="flex gap-2">
              <button onClick={() => setHtmlPreview(false)} className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 ${!htmlPreview ? "bg-primary-600 text-white" : "bg-white/5 text-gray-400"}`}>
                <Code className="w-4 h-4" /> Code
              </button>
              <button onClick={() => setHtmlPreview(true)} className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 ${htmlPreview ? "bg-primary-600 text-white" : "bg-white/5 text-gray-400"}`}>
                <Eye className="w-4 h-4" /> Preview
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCopyHtml} disabled={!htmlCode.trim()} className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white disabled:opacity-50">
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button onClick={handleClearHtml} disabled={!htmlCode.trim()} className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-red-400 disabled:opacity-50">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!htmlPreview ? (
            <textarea
              value={htmlCode}
              onChange={(e) => setHtmlCode(e.target.value)}
              placeholder="Paste HTML here..."
              className="flex-1 bg-black/40 border border-white/10 rounded-lg p-4 text-white placeholder-gray-600 resize-none font-mono text-sm"
            />
          ) : (
            <div className="flex-1 bg-black/40 border border-white/10 rounded-lg p-4 overflow-auto">
              <div className="prose prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: htmlCode }} />
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button onClick={handleHtmlParse} disabled={parsing || !htmlCode.trim()} className="btn-primary flex items-center justify-center gap-2 flex-1 disabled:opacity-50">
              <Zap className="w-4 h-4" /> {parsing ? "Parsing..." : "Parse HTML & Fill All"}
            </button>
            <button onClick={onClose} className="btn-secondary">Back</button>
          </div>
        </div>
      )}

      {!isStructuredTab && activeTab !== "html" && (
        <div className="flex-1 flex flex-col">
          <textarea
            value={content?.[currentTab?.field] || ""}
            onChange={(e) => updateLocalContent({ [currentTab?.field]: e.target.value })}
            placeholder={`Enter ${currentTab?.label}...`}
            className="flex-1 bg-black/20 border border-white/10 rounded-lg p-4 text-white placeholder-gray-500 resize-none"
          />
          <button onClick={() => handleSave(currentTab?.field, content?.[currentTab?.field] || "")} disabled={saving} className="mt-4 btn-primary flex items-center justify-center gap-2 w-full">
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
          </button>
        </div>
      )}

      {isStructuredTab && activeTab !== "html" && (
        <div className="flex-1 flex flex-col">
          <StructuredFieldEditor
            field={currentTab?.field}
            data={content?.[currentTab?.field] || []}
            onChange={(newData) => updateLocalContent({ [currentTab?.field]: newData })}
            onSave={() => handleSave(currentTab?.field, content?.[currentTab?.field])}
            saving={saving}
          />
        </div>
      )}

      {activeTab !== "html" && (
        <button onClick={handleSaveAll} disabled={saving} className="mt-4 btn-primary flex items-center justify-center gap-2">
          <Save className="w-4 h-4" /> {saving ? "Saving All..." : "Save All Content"}
        </button>
      )}
    </div>
  );
}

function StructuredFieldEditor({ field, data, onChange, onSave, saving }) {
  const addItem = () => {
    if (field === "timeline") onChange([...data, { year: "", event: "" }]);
    else if (field.includes("q")) onChange([...data, { q: "", a: "" }]);
    else if (field === "keyTerms" || field === "keyPeople") onChange([...data, { term: "", def: "" }]);
    else if (field === "quiz") onChange([...data, { q: "", options: ["", "", "", ""], correctIndex: 0 }]);
    else onChange([...data, {}]);
  };

  const updateItem = (index, key, value) => {
    const newData = [...data];
    newData[index] = { ...newData[index], [key]: value };
    onChange(newData);
  };

  const removeItem = (index) => onChange(data.filter((_, i) => i !== index));

  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div key={index} className="glass-card p-4 relative">
          <button onClick={() => removeItem(index)} className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-300 rounded">
            <Trash2 className="w-4 h-4" />
          </button>

          {field === "timeline" && (
            <div className="grid grid-cols-2 gap-4">
              <input type="text" value={item.year || ""} onChange={(e) => updateItem(index, "year", e.target.value)} placeholder="Year" className="input-field" />
              <input type="text" value={item.event || ""} onChange={(e) => updateItem(index, "event", e.target.value)} placeholder="Event" className="input-field" />
            </div>
          )}

          {field.includes("q") && !field.includes("key") && (
            <div className="space-y-3">
              <textarea value={item.q || ""} onChange={(e) => updateItem(index, "q", e.target.value)} placeholder="Question" className="input-field min-h-[60px]" />
              <textarea value={item.a || ""} onChange={(e) => updateItem(index, "a", e.target.value)} placeholder="Answer" className="input-field min-h-[80px]" />
            </div>
          )}

          {(field === "keyTerms" || field === "keyPeople") && (
            <div className="space-y-3">
              <input type="text" value={item.term || ""} onChange={(e) => updateItem(index, "term", e.target.value)} placeholder={field === "keyTerms" ? "Term" : "Name"} className="input-field" />
              <textarea value={item.def || ""} onChange={(e) => updateItem(index, "def", e.target.value)} placeholder={field === "keyTerms" ? "Definition" : "Contribution"} className="input-field min-h-[60px]" />
            </div>
          )}

          {field === "quiz" && (
            <div className="space-y-3">
              <input type="text" value={item.q || ""} onChange={(e) => updateItem(index, "q", e.target.value)} placeholder="Question" className="input-field" />
              <div className="grid grid-cols-2 gap-2">
                {(item.options || ["", "", "", ""]).map((opt, optIdx) => (
                  <input key={optIdx} type="text" value={opt} onChange={(e) => { const newOpts = [...(item.options || [])]; newOpts[optIdx] = e.target.value; updateItem(index, "options", newOpts); }} placeholder={`Option ${optIdx + 1}`} className="input-field text-sm" />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      <button onClick={addItem} className="btn-secondary w-full">+ Add {field?.charAt(0).toUpperCase() + field?.slice(1)}</button>
      <button onClick={onSave} disabled={saving} className="btn-primary flex items-center justify-center gap-2 w-full">
        <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
