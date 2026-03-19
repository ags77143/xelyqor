"use client";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { apiGet, apiPost } from "@/lib/api";
import toast from "react-hot-toast";
import { Zap, Trash2, FolderInput, Send } from "lucide-react";
import ConceptMap from "@/components/ConceptMap";

const MAIN_TABS = ["Study", "Game", "Story"];

const STUDY_TABS = [
  { id: "notes", label: "Notes" },
  { id: "glossary", label: "Glossary" },
  { id: "quiz", label: "Quiz" },
  { id: "flashcards", label: "Flashcards" },
  { id: "conceptmap", label: "Concept Map" },
];

const GAME_TABS = [
  { id: "memory", label: "🃏 Memory cards" },
  { id: "quizblitz", label: "⚡ Quiz blitz" },
  { id: "cloze", label: "✏️ Cloze" },
  { id: "truefalse", label: "↔️ True or false" },
  { id: "wordsearch", label: "🔍 Wordsearch" },
  { id: "crossword", label: "📐 Crossword" },
  { id: "anagram", label: "🔀 Anagram" },
  { id: "jeopardy", label: "🏆 Jeopardy" },
];

const STORY_TABS = [
  { id: "lightnovel", label: "📖 Light novel" },
  { id: "comic", label: "🎨 Comic panels" },
  { id: "visualnovel", label: "🎮 Visual novel" },
  { id: "cinematic", label: "🎬 Cinematic" },
];

const DEPTH_OPTIONS = [
  { id: "cooked", label: "💀 Cooked" },
  { id: "meh", label: "😐 Meh" },
  { id: "ontop", label: "🔥 On Top" },
];

export default function LectureView({ lectureId, user, subjects, onDelete, onMoved }) {
  const [lecture, setLecture] = useState(null);
  const [materials, setMaterials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState("");

  const [mainTab, setMainTab] = useState("Study");
  const [studyTab, setStudyTab] = useState("notes");
  const [gameTab, setGameTab] = useState("memory");
  const [storyTab, setStoryTab] = useState("lightnovel");
  const [depth, setDepth] = useState("meh");

  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState({});

  const [flipped, setFlipped] = useState({});
  const [fcIndex, setFcIndex] = useState(0);

  const [conceptData, setConceptData] = useState(null);
  const [generatingConcept, setGeneratingConcept] = useState(false);

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const [showMove, setShowMove] = useState(false);

  useEffect(() => {
    loadData();
    setQuizAnswers({});
    setQuizSubmitted({});
    setFlipped({});
    setFcIndex(0);
    setChatMessages([]);
    setConceptData(null);
  }, [lectureId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

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
      setStudyTab("quiz");
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
      setStudyTab("flashcards");
      toast.success("Flashcards generated!");
    } catch (e) {
      toast.error("Failed to generate flashcards: " + e.message);
    } finally {
      setGenerating("");
    }
  };

  const generateConceptMap = async () => {
    setGeneratingConcept(true);
    try {
      const data = await apiPost(`/concepts/${lectureId}/generate`);
      setConceptData(data);
      toast.success("Concept map generated!");
    } catch (e) {
      toast.error("Failed to generate concept map: " + e.message);
    } finally {
      setGeneratingConcept(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const newMsg = { role: "user", content: chatInput.trim() };
    const updatedMessages = [...chatMessages, newMsg];
    setChatMessages(updatedMessages);
    setChatInput("");
    setChatLoading(true);
    try {
      const { reply } = await apiPost("/chat/", {
        lecture_id: lectureId,
        messages: updatedMessages,
      });
      setChatMessages([...updatedMessages, { role: "assistant", content: reply }]);
    } catch (e) {
      toast.error("Chat error: " + e.message);
    } finally {
      setChatLoading(false);
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

  const getNotesContent = () => {
    if (depth === "cooked") return materials.notes_cooked || materials.notes;
    if (depth === "ontop") return materials.notes_ontop || materials.notes;
    return materials.notes;
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

  const activeSubTabs = mainTab === "Study" ? STUDY_TABS : mainTab === "Game" ? GAME_TABS : STORY_TABS;
  const activeSubTab = mainTab === "Study" ? studyTab : mainTab === "Game" ? gameTab : storyTab;
  const setActiveSubTab = mainTab === "Study" ? setStudyTab : mainTab === "Game" ? setGameTab : setStoryTab;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className="px-8 py-5 border-b border-cream-darker bg-white flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {lecture.subjects && (
                <span
                  className="text-xs px-2.5 py-0.5 rounded-full font-semibold text-white"
                  style={{ backgroundColor: lecture.subjects.colour || "#c17b2e" }}
                >
                  {lecture.subjects.name}
                </span>
              )}
              <span className="text-xs text-ink-light capitalize">{lecture.source_type}</span>
            </div>
            <h1 className="font-serif text-2xl text-ink truncate">{lecture.title}</h1>
            {materials.summary && (
              <p className="text-ink-light text-sm mt-2 leading-relaxed line-clamp-3">{materials.summary}</p>
            )}
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <div className="relative">
              <button
                onClick={() => setShowMove(!showMove)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cream border border-cream-darker rounded-lg text-ink hover:bg-cream-darker transition-colors"
              >
                <FolderInput size={13} />
                Move
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
              <Trash2 size={13} />
              Delete
            </button>
          </div>
        </div>

        {/* Main toggles row */}
        <div className="flex border-b border-cream-darker bg-white px-8 gap-1">
          {MAIN_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setMainTab(t)}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                mainTab === t ? "border-amber text-amber" : "border-transparent text-ink-light hover:text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Sub-tabs row */}
        <div className="flex border-b border-cream-darker bg-white px-8 gap-1">
          {activeSubTabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveSubTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeSubTab === id ? "border-amber text-amber" : "border-transparent text-ink-light hover:text-ink"
              }`}
            >
              {label}
              {mainTab === "Study" && id === "quiz" && !materials.quiz && (
                <span className="text-xs text-ink-light/60 italic ml-1">not generated</span>
              )}
              {mainTab === "Study" && id === "flashcards" && !materials.flashcards && (
                <span className="text-xs text-ink-light/60 italic ml-1">not generated</span>
              )}
              {mainTab === "Study" && id === "conceptmap" && !conceptData && (
                <span className="text-xs text-ink-light/60 italic ml-1">not generated</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">

          {/* STUDY CONTENT */}
          {mainTab === "Study" && studyTab === "notes" && (
            <div className="max-w-3xl">
              <div className="flex gap-2 mb-6">
                {DEPTH_OPTIONS.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDepth(d.id)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      depth === d.id
                        ? "bg-amber text-white border-amber"
                        : "bg-white border-cream-darker text-ink-light hover:border-ink-light"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <div className="prose-notes">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{getNotesContent() || "No notes available."}</ReactMarkdown>
              </div>
            </div>
          )}

          {mainTab === "Study" && studyTab === "glossary" && (
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

          {mainTab === "Study" && studyTab === "quiz" && (
            <div className="max-w-3xl">
              {!materials.quiz ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4">🎯</div>
                  <h3 className="font-serif text-xl text-ink mb-2">Ready to test your knowledge?</h3>
                  <p className="text-ink-light text-sm mb-6">Generate a 15–18 question quiz covering all lecture concepts.</p>
                  <button
                    onClick={generateQuiz}
                    disabled={!!generating}
                    className="flex items-center gap-2 px-6 py-3 bg-amber text-white font-semibold rounded-xl hover:bg-amber-light transition-colors disabled:opacity-60 mx-auto"
                  >
                    {generating === "quiz" ? <><div className="spinner" /> Generating...</> : <><Zap size={16} /> Generate Quiz</>}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {materials.quiz.map((q, qi) => (
                    <div key={qi} className="bg-white border border-cream-darker rounded-xl p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-cream text-ink-light flex-shrink-0 mt-0.5">
                          Q{qi + 1} · {q.difficulty}
                        </span>
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
                            <button
                              key={oi}
                              onClick={() => !submitted && setQuizAnswers((a) => ({ ...a, [qi]: oi }))}
                              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${cls}`}
                            >
                              {String.fromCharCode(65 + oi)}. {opt}
                            </button>
                          );
                        })}
                      </div>
                      {!quizSubmitted[qi] && quizAnswers[qi] !== undefined && (
                        <button
                          onClick={() => setQuizSubmitted((s) => ({ ...s, [qi]: true }))}
                          className="ml-12 mt-3 px-4 py-1.5 bg-amber text-white text-xs font-semibold rounded-lg hover:bg-amber-light transition-colors"
                        >
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

          {mainTab === "Study" && studyTab === "flashcards" && (
            <div className="max-w-2xl mx-auto">
              {!materials.flashcards ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4">🃏</div>
                  <h3 className="font-serif text-xl text-ink mb-2">Create flashcards for active recall</h3>
                  <p className="text-ink-light text-sm mb-6">Generate 22–28 question-based flashcards to reinforce your learning.</p>
                  <button
                    onClick={generateFlashcards}
                    disabled={!!generating}
                    className="flex items-center gap-2 px-6 py-3 bg-amber text-white font-semibold rounded-xl hover:bg-amber-light transition-colors disabled:opacity-60 mx-auto"
                  >
                    {generating === "flashcards" ? <><div className="spinner" /> Generating...</> : <><Zap size={16} /> Generate Flashcards</>}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <button
                      onClick={() => { setFcIndex((i) => Math.max(0, i - 1)); setFlipped({}); }}
                      disabled={fcIndex === 0}
                      className="px-4 py-2 bg-white border border-cream-darker rounded-lg text-sm text-ink disabled:opacity-40 hover:bg-cream transition-colors"
                    >
                      ← Previous
                    </button>
                    <span className="text-sm text-ink-light font-medium">
                      {fcIndex + 1} / {materials.flashcards.length}
                    </span>
                    <button
                      onClick={() => { setFcIndex((i) => Math.min(materials.flashcards.length - 1, i + 1)); setFlipped({}); }}
                      disabled={fcIndex === materials.flashcards.length - 1}
                      className="px-4 py-2 bg-white border border-cream-darker rounded-lg text-sm text-ink disabled:opacity-40 hover:bg-cream transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                  <div
                    className="perspective cursor-pointer"
                    onClick={() => setFlipped((f) => ({ ...f, [fcIndex]: !f[fcIndex] }))}
                    style={{ height: 280 }}
                  >
                    <div
                      className="flip-card relative w-full h-full"
                      style={{ transform: flipped[fcIndex] ? "rotateY(180deg)" : "rotateY(0deg)", transformStyle: "preserve-3d", transition: "transform 0.5s" }}
                    >
                      <div
                        className="flip-front absolute inset-0 bg-white border-2 border-amber/20 rounded-2xl flex flex-col items-center justify-center p-8 text-center"
                        style={{ backfaceVisibility: "hidden" }}
                      >
                        <div className="text-xs text-amber font-semibold uppercase tracking-widest mb-4">Question</div>
                        <p className="font-serif text-xl text-ink leading-relaxed">{materials.flashcards[fcIndex]?.front}</p>
                        <p className="text-xs text-ink-light mt-6">Click to reveal answer</p>
                      </div>
                      <div
                        className="flip-back absolute inset-0 bg-amber-pale border-2 border-amber/30 rounded-2xl flex flex-col items-center justify-center p-8 text-center"
                        style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                      >
                        <div className="text-xs text-amber font-semibold uppercase tracking-widest mb-4">Answer</div>
                        <p className="text-ink text-sm leading-relaxed">{materials.flashcards[fcIndex]?.back}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center gap-1.5 mt-6 flex-wrap">
                    {materials.flashcards.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => { setFcIndex(i); setFlipped({}); }}
                        className={`w-2 h-2 rounded-full transition-colors ${i === fcIndex ? "bg-amber" : "bg-cream-darker hover:bg-ink-light/40"}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {mainTab === "Study" && studyTab === "conceptmap" && (
            <div className="max-w-4xl">
              {!conceptData ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4">🗺️</div>
                  <h3 className="font-serif text-xl text-ink mb-2">Visualise how concepts connect</h3>
                  <p className="text-ink-light text-sm mb-6">Generate a concept map showing relationships between all key ideas.</p>
                  <button
                    onClick={generateConceptMap}
                    disabled={generatingConcept}
                    className="flex items-center gap-2 px-6 py-3 bg-amber text-white font-semibold rounded-xl hover:bg-amber-light transition-colors disabled:opacity-60 mx-auto"
                  >
                    {generatingConcept ? <><div className="spinner" /> Generating...</> : <><Zap size={16} /> Generate Concept Map</>}
                  </button>
                </div>
              ) : (
                <ConceptMap nodes={conceptData.nodes} edges={conceptData.edges} />
              )}
            </div>
          )}

          {/* GAME CONTENT */}
          {mainTab === "Game" && (
            <div className="max-w-3xl">
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🎮</div>
                <h3 className="font-serif text-xl text-ink mb-2">{GAME_TABS.find(g => g.id === gameTab)?.label} coming soon</h3>
                <p className="text-ink-light text-sm">Games are in development. Check back soon!</p>
              </div>
            </div>
          )}

          {/* STORY CONTENT */}
          {mainTab === "Story" && (
            <div className="max-w-3xl">
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📖</div>
                <h3 className="font-serif text-xl text-ink mb-2">{STORY_TABS.find(s => s.id === storyTab)?.label} coming soon</h3>
                <p className="text-ink-light text-sm">Story mode is in development. Check back soon!</p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Chat panel */}
      <div className="w-80 flex-shrink-0 border-l border-cream-darker flex flex-col bg-white">
        <div className="px-5 py-4 border-b border-cream-darker">
          <h3 className="font-serif text-base text-ink">Ask the lecture</h3>
          <p className="text-xs text-ink-light mt-0.5">AI tutor with full lecture context</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chatMessages.length === 0 && (
            <div className="text-center py-8 text-xs text-ink-light leading-relaxed">
              <div className="text-3xl mb-3">💬</div>
              Ask anything about the lecture — concepts, examples, exam tips, or connections to other topics.
            </div>
          )}
          {chatMessages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                  m.role === "user" ? "bg-amber text-white rounded-tr-sm" : "bg-cream text-ink rounded-tl-sm"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="bg-cream rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-light animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-light animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-light animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="p-4 border-t border-cream-darker">
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Ask a question..."
              className="flex-1 px-3 py-2 rounded-xl border border-cream-darker bg-cream text-ink text-xs focus:outline-none focus:ring-2 focus:ring-amber/40"
            />
            <button
              onClick={sendChat}
              disabled={chatLoading || !chatInput.trim()}
              className="w-9 h-9 flex items-center justify-center bg-amber text-white rounded-xl hover:bg-amber-light transition-colors disabled:opacity-40"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}