"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { apiGet, apiPost, apiPostForm } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpen, FileText, Calendar, Zap, ChevronRight, Clock, Upload } from "lucide-react";
import toast from "react-hot-toast";

export default function SubjectView({ subjectId, user, onSelectLecture }) {
  const [subject, setSubject] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("lectures");

  const [summary, setSummary] = useState(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const [studyPlan, setStudyPlan] = useState(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [examDate, setExamDate] = useState("");
  const [showExamInput, setShowExamInput] = useState(false);

  const [practiceExam, setPracticeExam] = useState(null);
  const [generatingExam, setGeneratingExam] = useState(false);
  const [pastPaper, setPastPaper] = useState(null);
  const [showExamUpload, setShowExamUpload] = useState(false);
  const [examAnswers, setExamAnswers] = useState({});

  useEffect(() => {
    if (!subjectId || !user) return;
    setLoading(true);
    setSummary(null);
    setStudyPlan(null);
    setPracticeExam(null);
    setActiveTab("lectures");

    const load = async () => {
      const { data: sub } = await supabase.from("subjects").select("*").eq("id", subjectId).single();
      setSubject(sub);
      const lecs = await apiGet(`/lectures/?user_id=${user.id}&subject_id=${subjectId}`);
      setLectures(lecs);
      setLoading(false);
    };
    load();
  }, [subjectId, user]);

  const generateSummary = async () => {
    if (lectures.length === 0) { toast.error("No lectures in this subject yet."); return; }
    setGeneratingSummary(true);
    try {
      const result = await apiPost("/subjects/summary", {
        subject_name: subject.name,
        lecture_ids: lectures.map(l => l.id),
      });
      setSummary(result);
      setActiveTab("summary");
      toast.success("Course summary generated!");
    } catch (e) {
      toast.error("Failed: " + e.message);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const generateStudyPlan = async () => {
    if (!examDate) { toast.error("Please enter your exam date."); return; }
    if (lectures.length === 0) { toast.error("No lectures yet."); return; }
    setGeneratingPlan(true);
    try {
      const result = await apiPost("/subjects/study-plan", {
        subject_name: subject.name,
        lecture_ids: lectures.map(l => l.id),
        exam_date: examDate,
      });
      setStudyPlan(result);
      setActiveTab("studyplan");
      setShowExamInput(false);
      toast.success("Study plan generated!");
    } catch (e) {
      toast.error("Failed: " + e.message);
    } finally {
      setGeneratingPlan(false);
    }
  };

  const generatePracticeExam = async () => {
    if (lectures.length === 0) { toast.error("No lectures yet."); return; }
    setGeneratingExam(true);
    try {
      const fd = new FormData();
      fd.append("subject_name", subject.name);
      fd.append("lecture_ids", JSON.stringify(lectures.map(l => l.id)));
      if (pastPaper) fd.append("past_paper", pastPaper);
      const result = await apiPostForm("/subjects/practice-exam", fd);
      setPracticeExam(result);
      setActiveTab("exam");
      setShowExamUpload(false);
      setExamAnswers({});
      toast.success("Practice exam generated!");
    } catch (e) {
      toast.error("Failed: " + e.message);
    } finally {
      setGeneratingExam(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-5 border-b border-cream-darker bg-white flex items-center gap-4 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ backgroundColor: subject?.colour || "#c17b2e" }} />
        <div>
          <h1 className="font-serif text-2xl text-ink">{subject?.name}</h1>
          <p className="text-ink-light text-sm">{lectures.length} lecture{lectures.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {/* Tool buttons */}
        <div className="grid grid-cols-3 gap-3 mb-6 max-w-3xl">
          <button
            onClick={generateSummary}
            disabled={generatingSummary}
            className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-cream-darker rounded-2xl hover:border-amber/40 transition-all disabled:opacity-60"
          >
            {generatingSummary ? <div className="spinner" /> : <BookOpen size={22} className="text-amber" />}
            <span className="text-sm font-semibold text-ink">Course Summary</span>
            <span className="text-xs text-ink-light text-center">Master checklist of everything to know</span>
          </button>

          <button
            onClick={() => { setShowExamUpload(!showExamUpload); setShowExamInput(false); }}
            className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-cream-darker rounded-2xl hover:border-amber/40 transition-all"
          >
            <FileText size={22} className="text-amber" />
            <span className="text-sm font-semibold text-ink">Practice Exam</span>
            <span className="text-xs text-ink-light text-center">Generate a full exam paper</span>
          </button>

          <button
            onClick={() => { setShowExamInput(!showExamInput); setShowExamUpload(false); }}
            className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-cream-darker rounded-2xl hover:border-amber/40 transition-all"
          >
            <Calendar size={22} className="text-amber" />
            <span className="text-sm font-semibold text-ink">Study Plan</span>
            <span className="text-xs text-ink-light text-center">Day by day schedule to your exam</span>
          </button>
        </div>

        {/* Practice exam upload panel */}
        {showExamUpload && (
          <div className="bg-white border border-cream-darker rounded-2xl p-5 mb-6 max-w-3xl">
            <h3 className="font-semibold text-ink text-sm mb-3">Generate Practice Exam</h3>
            <p className="text-xs text-ink-light mb-4">Optionally upload a past exam paper (PDF) to tailor the style.</p>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-ink-light hover:text-ink transition-colors mb-4">
              <Upload size={16} />
              <span>{pastPaper ? pastPaper.name : "Upload past exam paper (optional)"}</span>
              <input type="file" accept=".pdf" className="hidden" onChange={(e) => setPastPaper(e.target.files[0])} />
            </label>
            <button
              onClick={generatePracticeExam}
              disabled={generatingExam}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber text-white font-semibold rounded-xl hover:bg-amber-light transition-colors disabled:opacity-60 text-sm"
            >
              {generatingExam ? <><div className="spinner" /> Generating...</> : <><Zap size={14} /> Generate Exam</>}
            </button>
          </div>
        )}

        {/* Exam date input */}
        {showExamInput && (
          <div className="bg-white border border-cream-darker rounded-2xl p-5 mb-6 max-w-3xl flex items-center gap-4">
            <Calendar size={18} className="text-amber flex-shrink-0" />
            <div className="flex-1">
              <label className="block text-sm font-semibold text-ink mb-1">When is your exam?</label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-cream-darker bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-amber/40 text-sm"
              />
            </div>
            <button
              onClick={generateStudyPlan}
              disabled={generatingPlan || !examDate}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber text-white font-semibold rounded-xl hover:bg-amber-light transition-colors disabled:opacity-60 text-sm flex-shrink-0"
            >
              {generatingPlan ? <><div className="spinner" /> Generating...</> : <><Zap size={14} /> Generate</>}
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-cream-darker mb-6 max-w-3xl">
          {["lectures", "summary", "exam", "studyplan"].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === t ? "border-amber text-amber" : "border-transparent text-ink-light hover:text-ink"}`}
            >
              {t === "summary" ? "Course Summary" : t === "studyplan" ? "Study Plan" : t === "exam" ? "Practice Exam" : "Lectures"}
            </button>
          ))}
        </div>

        {/* Lectures tab */}
        {activeTab === "lectures" && (
          <div className="space-y-3 max-w-3xl">
            {lectures.length === 0 ? (
              <div className="text-center py-16 text-ink-light">
                <p className="text-lg font-medium">No lectures yet</p>
                <p className="text-sm mt-1">Upload a lecture and assign it to this subject</p>
              </div>
            ) : (
              lectures.map((l) => (
                <div
                  key={l.id}
                  onClick={() => onSelectLecture(l.id)}
                  className="bg-white border border-cream-darker rounded-xl p-5 flex items-center gap-4 cursor-pointer hover:border-amber/40 hover:shadow-sm transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-ink text-sm truncate">{l.title}</h3>
                    <p className="text-xs text-ink-light mt-0.5 capitalize">{l.source_type} · {new Date(l.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <ChevronRight size={16} className="text-ink-light group-hover:text-amber transition-colors flex-shrink-0" />
                </div>
              ))
            )}
          </div>
        )}

        {/* Summary tab */}
        {activeTab === "summary" && (
          <div className="max-w-3xl">
            {!summary ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📋</div>
                <h3 className="font-serif text-xl text-ink mb-2">Generate your course summary</h3>
                <p className="text-ink-light text-sm mb-6">AI will analyse all {lectures.length} lectures and create a master checklist.</p>
                <button onClick={generateSummary} disabled={generatingSummary} className="flex items-center gap-2 px-6 py-3 bg-amber text-white font-semibold rounded-xl hover:bg-amber-light transition-colors disabled:opacity-60 mx-auto">
                  {generatingSummary ? <><div className="spinner" /> Generating...</> : <><Zap size={16} /> Generate Course Summary</>}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white border border-cream-darker rounded-2xl p-6">
                  <h2 className="font-serif text-xl text-ink mb-4">Course Overview</h2>
                  <p className="text-ink text-sm leading-relaxed">{summary.overview}</p>
                </div>
                <div className="bg-white border border-cream-darker rounded-2xl p-6">
                  <h2 className="font-serif text-xl text-ink mb-4">What You Need to Know ✓</h2>
                  <div className="space-y-2">
                    {summary.checklist?.map((item, i) => <ChecklistItem key={i} text={item} />)}
                  </div>
                </div>
                {summary.themes && (
                  <div className="bg-white border border-cream-darker rounded-2xl p-6">
                    <h2 className="font-serif text-xl text-ink mb-4">Key Themes</h2>
                    <div className="prose-notes">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary.themes}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Practice exam tab */}
        {activeTab === "exam" && (
          <div className="max-w-3xl">
            {!practiceExam ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📝</div>
                <h3 className="font-serif text-xl text-ink mb-2">Generate a practice exam</h3>
                <p className="text-ink-light text-sm mb-6">Click Practice Exam above to generate a full exam paper.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white border-2 border-ink rounded-2xl p-6 text-center">
                  <h2 className="font-serif text-2xl text-ink mb-2">{practiceExam.title}</h2>
                  <div className="flex justify-center gap-8 text-sm text-ink-light mt-3">
                    <span>⏱ {practiceExam.time_allowed}</span>
                    <span>📊 Total: {practiceExam.total_marks} marks</span>
                  </div>
                  <p className="text-xs text-ink-light mt-3 italic">{practiceExam.instructions}</p>
                </div>
                {practiceExam.sections?.map((section, si) => (
                  <div key={si} className="bg-white border border-cream-darker rounded-2xl overflow-hidden">
                    <div className="bg-ink px-6 py-3 flex justify-between items-center">
                      <h3 className="font-semibold text-white text-sm">{section.name}</h3>
                      <span className="text-amber text-sm font-bold">{section.marks} marks</span>
                    </div>
                    {section.instructions && <p className="px-6 py-2 text-xs text-ink-light italic border-b border-cream-darker">{section.instructions}</p>}
                    <div className="divide-y divide-cream-darker">
                      {section.questions?.map((q, qi) => (
                        <div key={qi} className="p-6">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <p className="text-ink text-sm font-medium leading-relaxed flex-1">
                              <span className="font-bold text-amber mr-2">Q{q.number}.</span>{q.question}
                            </p>
                            <span className="text-xs text-ink-light flex-shrink-0 bg-cream px-2 py-1 rounded-lg">{q.marks} marks</span>
                          </div>
                          {q.type === "mcq" && q.options && (
                            <div className="space-y-2 ml-6">
                              {q.options.map((opt, oi) => (
                                <button
                                  key={oi}
                                  onClick={() => setExamAnswers(a => ({ ...a, [`${si}-${qi}`]: oi }))}
                                  className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${examAnswers[`${si}-${qi}`] === oi ? "bg-amber-pale border-2 border-amber text-amber font-medium" : "bg-cream border border-cream-darker text-ink hover:bg-cream-darker"}`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          )}
                          {(q.type === "short" || q.type === "extended") && (
                            <textarea
                              placeholder="Write your answer here..."
                              rows={q.type === "extended" ? 8 : 4}
                              className="w-full ml-6 mt-2 px-4 py-3 rounded-xl border border-cream-darker bg-cream text-ink text-sm focus:outline-none focus:ring-2 focus:ring-amber/40 resize-none"
                              style={{ width: "calc(100% - 1.5rem)" }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Study plan tab */}
        {activeTab === "studyplan" && (
          <div className="max-w-3xl">
            {!studyPlan ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📅</div>
                <h3 className="font-serif text-xl text-ink mb-2">Generate your study plan</h3>
                <p className="text-ink-light text-sm mb-6">Click Study Plan above and enter your exam date.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white border border-cream-darker rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Clock size={20} className="text-amber" />
                    <h2 className="font-serif text-xl text-ink">{studyPlan.days_until_exam} days until exam</h2>
                  </div>
                  <p className="text-ink text-sm leading-relaxed">{studyPlan.overview}</p>
                </div>
                <div className="bg-white border border-cream-darker rounded-2xl p-6">
                  <h2 className="font-serif text-xl text-ink mb-5">Daily Schedule</h2>
                  <div className="space-y-4">
                    {studyPlan.schedule?.map((day, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex-shrink-0 w-16 text-center">
                          <div className="bg-amber text-white text-xs font-bold rounded-lg px-2 py-1">Day {day.day}</div>
                          <div className="text-xs text-ink-light mt-1">{day.date}</div>
                        </div>
                        <div className="flex-1 pb-4 border-b border-cream-darker last:border-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-ink text-sm">{day.focus}</h3>
                            <span className="text-xs text-ink-light">{day.duration}</span>
                          </div>
                          <ul className="space-y-1">
                            {day.tasks?.map((task, ti) => (
                              <li key={ti} className="text-xs text-ink-light flex items-start gap-2">
                                <span className="text-amber mt-0.5">▸</span>{task}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {studyPlan.tips && (
                  <div className="bg-white border border-cream-darker rounded-2xl p-6">
                    <h2 className="font-serif text-xl text-ink mb-4">Study Tips</h2>
                    <div className="space-y-2">
                      {studyPlan.tips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm text-ink">
                          <span className="text-amber font-bold flex-shrink-0">{i + 1}.</span>{tip}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ChecklistItem({ text }) {
  const [checked, setChecked] = useState(false);
  return (
    <div onClick={() => setChecked(!checked)} className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${checked ? "bg-green-50" : "hover:bg-cream"}`}>
      <div className={`w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${checked ? "bg-green-500 border-green-500" : "border-cream-darker"}`}>
        {checked && <span className="text-white text-xs">✓</span>}
      </div>
      <p className={`text-sm leading-relaxed transition-colors ${checked ? "text-ink-light line-through" : "text-ink"}`}>{text}</p>
    </div>
  );
}