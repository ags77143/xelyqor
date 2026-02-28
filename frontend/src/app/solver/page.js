"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { apiPost, apiPostForm } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Lightbulb, ImagePlus, FileText, X } from "lucide-react";
import toast from "react-hot-toast";

const GENERAL_SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology",
  "Computer Science", "Economics", "Law", "Statistics",
  "Engineering", "Medicine", "Accounting", "Other"
];

export default function SolverPage() {
  const [question, setQuestion] = useState("");
  const [subjectType, setSubjectType] = useState("general");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [solution, setSolution] = useState("");
  const [loading, setLoading] = useState(false);
  const [mySubjects, setMySubjects] = useState([]);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fileType, setFileType] = useState(null); // "image" | "pdf"

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data } = await supabase.from("subjects").select("*").eq("user_id", session.user.id);
        setMySubjects(data || []);
      }
    });
  }, []);

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const f = item.getAsFile();
        if (f) {
          setFile(f);
          setFilePreview(URL.createObjectURL(f));
          setFileType("image");
          toast.success("Image pasted!");
        }
        break;
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const isPdf = f.name.toLowerCase().endsWith(".pdf");
    setFile(f);
    setFileType(isPdf ? "pdf" : "image");
    setFilePreview(isPdf ? null : URL.createObjectURL(f));
  };

  const clearFile = () => {
    setFile(null);
    setFilePreview(null);
    setFileType(null);
  };

  const getSubjectContext = () => {
    if (subjectType === "general") return selectedSubject;
    if (subjectType === "mine") return selectedSubject;
    if (subjectType === "custom") return customSubject;
    return "";
  };

  const handleSolve = async () => {
    if (!question.trim() && !file) {
      toast.error("Please enter a question or attach a file.");
      return;
    }
    setLoading(true);
    setSolution("");
    try {
      let result;
      if (file) {
        const fd = new FormData();
        fd.append("question", question.trim());
        fd.append("subject", getSubjectContext());
        fd.append("file", file);
        result = await apiPostForm("/solver/with-file", fd);
      } else {
        result = await apiPost("/solver/", {
          question: question.trim(),
          subject: getSubjectContext(),
        });
      }
      setSolution(result.solution);
    } catch (e) {
      toast.error("Failed to solve: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl text-ink mb-2">
            <span className="text-amber">Question</span> Solver
          </h1>
          <p className="text-ink-light text-sm">
            Type a question, upload an image or PDF, or <span className="font-medium text-ink">Ctrl+V</span> to paste a screenshot.
          </p>
        </div>

        {/* Subject selector */}
        <div className="bg-white border border-cream-darker rounded-2xl p-6 mb-4">
          <label className="block text-sm font-semibold text-ink mb-3">Subject context (optional)</label>
          <div className="flex gap-2 mb-4">
            {["general", "mine", "custom"].map((type) => (
              <button
                key={type}
                onClick={() => { setSubjectType(type); setSelectedSubject(""); }}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${subjectType === type ? "bg-amber text-white" : "bg-cream border border-cream-darker text-ink-light hover:text-ink"}`}
              >
                {type === "general" ? "General" : type === "mine" ? "My Subjects" : "Type Own"}
              </button>
            ))}
          </div>
          {subjectType === "general" && (
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-cream-darker bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-amber/40 text-sm">
              <option value="">— Select subject —</option>
              {GENERAL_SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {subjectType === "mine" && (
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-cream-darker bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-amber/40 text-sm">
              <option value="">— Select your subject —</option>
              {mySubjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          )}
          {subjectType === "custom" && (
            <input type="text" value={customSubject} onChange={(e) => setCustomSubject(e.target.value)} placeholder="e.g. MATH1131 UNSW, Year 12 Chemistry..." className="w-full px-4 py-2.5 rounded-xl border border-cream-darker bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-amber/40 text-sm" />
          )}
        </div>

        {/* Question + file input */}
        <div className="bg-white border border-cream-darker rounded-2xl p-6 mb-4">
          <label className="block text-sm font-semibold text-ink mb-3">
            {file ? "Additional instructions (optional)" : "Your question"}
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={file
              ? fileType === "pdf"
                ? 'e.g. "Only answer question 3" or "Focus on part b"'
                : 'e.g. "Solve for x" or leave blank to solve everything visible'
              : "Paste or type your question here..."}
            rows={file ? 3 : 6}
            className="w-full px-4 py-3 rounded-xl border border-cream-darker bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-amber/40 text-sm resize-none"
          />

          {/* File attachment */}
          <div className="mt-3">
            {!file ? (
              <label className="flex items-center gap-2 cursor-pointer text-sm text-ink-light hover:text-ink transition-colors">
                <ImagePlus size={16} />
                <span>Attach image or PDF (or paste screenshot with Ctrl+V)</span>
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
              </label>
            ) : (
              <div className="flex items-start gap-3 p-3 bg-cream rounded-xl">
                {fileType === "image" && filePreview ? (
                  <img src={filePreview} alt="Question" className="max-h-40 rounded-lg border border-cream-darker" />
                ) : (
                  <div className="flex items-center gap-2 text-sm text-ink">
                    <FileText size={20} className="text-amber flex-shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </div>
                )}
                <button onClick={clearFile} className="ml-auto flex-shrink-0 p-1 rounded-full bg-white shadow text-ink-light hover:text-red-500 transition-colors">
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleSolve}
            disabled={loading}
            className="mt-4 w-full py-3 bg-amber text-white font-semibold rounded-xl hover:bg-amber-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <><div className="spinner" /> Solving...</> : <><Lightbulb size={16} /> Solve Question</>}
          </button>
        </div>

        {/* Solution */}
        {solution && (
          <div className="bg-white border border-cream-darker rounded-2xl p-6">
            <h2 className="font-serif text-xl text-ink mb-4">Solution</h2>
            <div className="prose-notes">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{solution}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}