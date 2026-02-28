"use client";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { apiGet, apiPost } from "@/lib/api";
import toast from "react-hot-toast";
import { Zap, Trash2, FolderInput, BookOpen, List, HelpCircle, Layers, GitFork } from "lucide-react";
import ConceptMap from "@/components/ConceptMap";

const TABS = [
  { id: "notes", label: "Notes", icon: BookOpen },
  { id: "glossary", label: "Glossary", icon: List },
  { id: "quiz", label: "Quiz", icon: HelpCircle },
  { id: "flashcards", label: "Flashcards", icon: Layers },
  { id: "concepts", label: "Concept Map", icon: GitFork },
];

export default function LectureView({ lectureId, user, subjects, onDelete, onMoved }) {
  const [lecture, setLecture] = useState(null);
  const [materials, setMaterials] = useState(null);
  const [tab, setTab] = useState("notes");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState("");
  const [conceptMap, setConceptMap] = useState(null);
  const [generatingConcepts, setGeneratingConcepts] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState({});
  const [flipped, setFlipped] = useState({});
  const [fcIndex, setFcIndex] = useState(0);
  const [showMove, setShowMove] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  useEffect(() => {
    loadData();
    setQuizAnswers({});
    setQuizSubmitted({});
    setFlipped({});
    setFcIndex(0);
    setConceptMap(null);
    setTab("notes");
    setHeaderCollapsed(false);
  }, [lectureId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [lec, mat] = await Promise.all([
        apiGet(`/lectures/${lectureId}`),
        apiGet(`/materials/${lectureId}`),
      ]);
      setLecture(lec);
      setMaterials(mat);
    } catch (e) {
      toast.error("Failed to load lecture: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const generateQuiz = async () => {
    setGenerating("quiz");
    try {
      const quiz = await apiPost(`/materials/${lectureId}/generate-quiz`);
      setMaterials((m) => ({ ...m, quiz }));
      setTab("quiz");
      toast.success("Quiz generated!");
    } catch (e) {
      toast.error("Failed to generate quiz: " + e.message);
    } finally {
      setGenerating("");
    }
  };

  const generateFlashcards = async () => {
    setGenerating("flashcards");
    try {
      const flashcards = await apiPost(`/materials/${lectureId}/generate-flashcards`);
      setMaterials((m) => ({ ...m, flashcards }));
      setTab("flashcards");
      toast.success("Flashcards generated!");
    } catch (e) {
      toast.error("Failed to generate flashcards: " + e.message);
    } finally {
      setGenerating("");
    }
  };

  const generateConceptMap = async () => {
    setGeneratingConcepts(true);
    try {
      const data = await apiPost("/concepts/", {
        lecture_id: lectureId,
        notes: materials.notes || "",
        title: lecture.title,
      });
      setConceptMap(data);
      setTab("concepts");
      toast.success("Concept map generated!");
    } catch (e) {
      toast.error("Failed to generate concept map: " + e.message);
    } finally {
      setGeneratingConcepts(false);
    }
  };

  const moveLecture = async (newSubjectId) => {
    const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    await fetch(`${BASE}/lectures/${lectureId}/move?subject_id=${newSubjectId}`, { method: "PATCH" });
    toast.success("Lecture moved!");
    setShowMove(false);
    onMoved?.();
    loadData();
  };

  const deleteLecture = async () => {
    if (!confirm("Delete this lecture and all its study materials? This cannot be undone.")) return;
    const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    await fetch(`${BASE}/lectures/${lectureId}`, { method: "DELETE" });
    toast.success("Lecture deleted.");
    onDelete?.();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
          <p className="text-ink-light text-sm">Loading materials...</p>
        </div>
      </div>
    );
  }

  if (!lecture || !materials) {
    return <div className="flex-1 flex items-center justify-center text-ink-light">Lecture not found.</div>;
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <div className="border-b border-cream-darker bg-white flex-shrink-0 transition-all duration-300">
        <div className="px-8 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {lecture.subjects && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold text-white" style={{ backgroundColor: lecture.subjects.colour || "#c17b2e" }}>
                  {lecture.subjects.name}
                </span>
              )}
              <span className="text-xs text-ink-light capitalize">{lecture.source_type}</span>
            </div>
            <h1 className="font-serif text-2xl text-ink truncate">{lecture.title}</h1>
            {materials.summary && (
              <div className={`transition-all duration-300 overflow-hidden ${headerCollapsed ? "max-h-0 opacity-0" : "max-h-24 opacity-100"}`}>
                <p className="text-ink-light text-sm mt-2 leading-relaxed line-clamp-3">{materials.summary}</p>
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <div className="relative">
              <button
                onClick={() => setShowMove(!showMove)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cream border border-cream-darker rounded-lg text-ink hover:bg-cream-darker transition-colors"
              >
                <FolderInput size={13} /> Move
              </button>
              {showMove && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-cream-darker rounded-xl shadow-lg p-2 z-20 w-48">
                  {subjects?.filter((s) => s.id !== lecture.subject_id).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => moveLecture(s.id)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-ink hover:bg-cream rounded-lg"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.colour || "#c17b2e" }} />
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={deleteLecture}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cream border border-cream-darker rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-cream-darker bg-white px-8 gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === id ? "border-amber text-amber" : "border-transparent text-ink-light hover:text-ink"}`}
            >
              <Icon size={14} />
              {label}
              {id === "quiz" && !materials.quiz && <span className="text-xs text-ink-light/60 italic ml-1">not generated</span>}
              {id === "flashcards" && !materials.flashcards && <span className="text-xs text-ink-light/60 italic ml-1">not generated</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto p-8"
        onScroll={(e) => setHeaderCollapsed(e.target.scrollTop > 60)}
      >
        {tab === "notes" && (
          <div className="max-w-3xl prose-notes">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{materials.notes || "No notes available."}</ReactMarkdown>
          </div>
        )}

        {tab === "glossary" && (
          <div className="max-w-3xl space-y-4">
            {Array.isArray(materials.glossary) ? (
              materials.glossary.map((item, i) => (
                <div key={i} className="bg-white border border-cream-darker rounded-xl p-5">
                  <h3 className="font-serif text-lg text-amber font-semibold mb-2">{item.term}</h3>
                  <p className="text-ink text-sm leading-relaxed">{item.definition}</p>
                </div>
              ))
            ) : (
              <p className="text-ink-light">No glossary available.</p>
            )}
          </div>
        )}

        {tab === "quiz" && (
          <div className="max-w-3xl">
            {!materials.quiz ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🎯</div>
                <h3 className="font-serif text-xl text-ink mb-2">Ready to test your knowledge?</h3>
                <p className="text-ink-light text-sm mb-6">Generate a 15–18 question quiz covering all lecture concepts.</p>
                <button onClick={generateQuiz} disabled={!!generating} className="flex items-center gap-2 px-6 py-3 bg-amber text-white font-semibold rounded-xl hover:bg-amber-light transition-colors disabled:opacity-60 mx-auto">
                  {generating === "quiz" ? <><div className="spinner" /> Generating...</> : <><Zap size={16} /> Generate Quiz</>}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {materials.quiz.map((q, qi) => (
                  <div key={qi} className="bg-white border border-cream-darker rounded-xl p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-cream text-ink-light flex-shrink-0 mt-0.5">Q{qi + 1} · {q.difficulty}</span>
                      <p className="font-medium text-ink text-sm leading-relaxed">{q.question}</p>
                    </div>
                    <div className="space-y-2 ml-12">
                      {q.options.map((opt, oi) => {
                        const selected = quizAnswers[qi] === oi;
                        const submitted = quizSubmitted[qi];
                        const isCorrect = oi === q.correct;
                        let cls = "border border-cream-darker text-ink bg-cream hover:bg-cream-darker";
                        if (submitted) {
                          if (isCorrect) cls = "border-green-400 bg-green-50 text-green-800";
                          else if (selected && !isCorrect) cls = "border-red-400 bg-red-50 text-red-800";
                        } else if (selected) {
                          cls = "border-amber bg-amber-pale text-amber";
                        }
                        return (
                          <button key={oi} onClick={() => !submitted && setQuizAnswers((a) => ({ ...a, [qi]: oi }))} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${cls}`}>
                            {String.fromCharCode(65 + oi)}. {opt}
                          </button>
                        );
                      })}
                    </div>
                    {!quizSubmitted[qi] && quizAnswers[qi] !== undefined && (
                      <button onClick={() => setQuizSubmitted((s) => ({ ...s, [qi]: true }))} className="ml-12 mt-3 px-4 py-1.5 bg-amber text-white text-xs font-semibold rounded-lg hover:bg-amber-light transition-colors">
                        Submit
                      </button>
                    )}
                    {quizSubmitted[qi] && (
                      <div className="ml-12 mt-3 p-3 bg-cream rounded-lg">
                        <p className="text-xs text-ink-light leading-relaxed">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "flashcards" && (
          <div className="max-w-2xl mx-auto">
            {!materials.flashcards ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🃏</div>
                <h3 className="font-serif text-xl text-ink mb-2">Create flashcards for active recall</h3>
                <p className="text-ink-light text-sm mb-6">Generate 22–28 question-based flashcards to reinforce your learning.</p>
                <button onClick={generateFlashcards} disabled={!!generating} className="flex items-center gap-2 px-6 py-3 bg-amber text-white font-semibold rounded-xl hover:bg-amber-light transition-colors disabled:opacity-60 mx-auto">
                  {generating === "flashcards" ? <><div className="spinner" /> Generating...</> : <><Zap size={16} /> Generate Flashcards</>}
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <button onClick={() => { setFcIndex((i) => Math.max(0, i - 1)); setFlipped({}); }} disabled={fcIndex === 0} className="px-4 py-2 bg-white border border-cream-darker rounded-lg text-sm text-ink disabled:opacity-40 hover:bg-cream transition-colors">← Previous</button>
                  <span className="text-sm text-ink-light font-medium">{fcIndex + 1} / {materials.flashcards.length}</span>
                  <button onClick={() => { setFcIndex((i) => Math.min(materials.flashcards.length - 1, i + 1)); setFlipped({}); }} disabled={fcIndex === materials.flashcards.length - 1} className="px-4 py-2 bg-white border border-cream-darker rounded-lg text-sm text-ink disabled:opacity-40 hover:bg-cream transition-colors">Next →</button>
                </div>
                <div className="perspective cursor-pointer" onClick={() => setFlipped((f) => ({ ...f, [fcIndex]: !f[fcIndex] }))} style={{ height: 280 }}>
                  <div className="flip-card relative w-full h-full" style={{ transform: flipped[fcIndex] ? "rotateY(180deg)" : "rotateY(0deg)", transformStyle: "preserve-3d", transition: "transform 0.5s" }}>
                    <div className="flip-front absolute inset-0 bg-white border-2 border-amber/20 rounded-2xl flex flex-col items-center justify-center p-8 text-center" style={{ backfaceVisibility: "hidden" }}>
                      <div className="text-xs text-amber font-semibold uppercase tracking-widest mb-4">Question</div>
                      <p className="font-serif text-xl text-ink leading-relaxed">{materials.flashcards[fcIndex]?.front}</p>
                      <p className="text-xs text-ink-light mt-6">Click to reveal answer</p>
                    </div>
                    <div className="flip-back absolute inset-0 bg-amber-pale border-2 border-amber/30 rounded-2xl flex flex-col items-center justify-center p-8 text-center" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                      <div className="text-xs text-amber font-semibold uppercase tracking-widest mb-4">Answer</div>
                      <p className="text-ink text-sm leading-relaxed">{materials.flashcards[fcIndex]?.back}</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center gap-1.5 mt-6 flex-wrap">
                  {materials.flashcards.map((_, i) => (
                    <button key={i} onClick={() => { setFcIndex(i); setFlipped({}); }} className={`w-2 h-2 rounded-full transition-colors ${i === fcIndex ? "bg-amber" : "bg-cream-darker hover:bg-ink-light/40"}`} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "concepts" && (
          <div className="max-w-3xl">
            {!conceptMap ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🗺️</div>
                <h3 className="font-serif text-xl text-ink mb-2">Visualise how concepts connect</h3>
                <p className="text-ink-light text-sm mb-6">Generate a visual map of all key concepts and their relationships.</p>
                <button onClick={generateConceptMap} disabled={generatingConcepts} className="flex items-center gap-2 px-6 py-3 bg-amber text-white font-semibold rounded-xl hover:bg-amber-light transition-colors disabled:opacity-60 mx-auto">
                  {generatingConcepts ? <><div className="spinner" /> Generating...</> : <><Zap size={16} /> Generate Concept Map</>}
                </button>
              </div>
            ) : (
              <ConceptMap nodes={conceptMap.nodes} edges={conceptMap.edges} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}