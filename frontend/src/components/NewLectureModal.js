"use client";
import { useState } from "react";
import { X, Youtube, FileText, Upload, Mic, Square } from "lucide-react";
import { apiPostForm } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

const SOURCE_TYPES = [
  { id: "youtube", label: "YouTube URL", icon: Youtube },
  { id: "transcript", label: "Paste Transcript", icon: FileText },
  { id: "file", label: "Upload File (PDF/PPTX)", icon: Upload },
  { id: "recording", label: "Record Lecture", icon: Mic },
];

const SUBJECT_COLOURS = ["#c17b2e", "#2e7bc1", "#6b4fc8", "#2ec17b", "#c12e5a", "#c18b2e"];

export default function NewLectureModal({ subjects, user, onClose, onCreated }) {
  const [step, setStep] = useState(1); // 1=type, 2=name+subject, 3=content
  const [sourceType, setSourceType] = useState("");
  const [lectureName, setLectureName] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
const [recording, setRecording] = useState(false);
const [mediaRecorder, setMediaRecorder] = useState(null);
const [audioBlob, setAudioBlob] = useState(null);
const [recordingTime, setRecordingTime] = useState(0);
const [timerInterval, setTimerInterval] = useState(null);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const options = { mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: 16000 };
    const mr = new MediaRecorder(stream, options);
    const chunks = [];
    mr.ondataavailable = (e) => chunks.push(e.data);
    mr.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      setAudioBlob(blob);
    };
    mr.start(10000);
    setMediaRecorder(mr);
    setRecording(true);
    setRecordingTime(0);
    const interval = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    setTimerInterval(interval);
  };

  const stopRecording = () => {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach((t) => t.stop());
    setRecording(false);
    clearInterval(timerInterval);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };
const handleSubmit = async () => {
    if (!sourceType || !lectureName.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
    let resolvedSubjectId = (subjectId === "__new__" || subjectId === "") ? "" : subjectId;

      // Create new subject if needed
      if (!resolvedSubjectId && newSubjectName.trim()) {
        const colour = SUBJECT_COLOURS[Math.floor(Math.random() * SUBJECT_COLOURS.length)];
        const { data } = await supabase.from("subjects").insert({
          user_id: user.id,
          name: newSubjectName.trim(),
          colour,
        }).select().single();
        resolvedSubjectId = data.id;
      }

      if (!resolvedSubjectId) {
        toast.error("Please select or create a subject.");
        setLoading(false);
        return;
      }

      const fd = new FormData();
      fd.append("user_id", user.id);
      fd.append("subject_id", resolvedSubjectId);
      fd.append("lecture_name", lectureName.trim());

      let endpoint = "";
      if (sourceType === "youtube") {
        fd.append("youtube_url", youtubeUrl.trim());
        endpoint = "/lectures/from-youtube";
      } else if (sourceType === "transcript") {
        fd.append("transcript", transcript.trim());
        endpoint = "/lectures/from-transcript";
      } else if (sourceType === "recording") {
        if (!audioBlob) {
          toast.error("Please record audio first.");
          setLoading(false);
          return;
        }
        fd.append("audio", audioBlob, "recording.webm");
        endpoint = "/lectures/from-recording";
      } else {
        fd.append("file", file);
        endpoint = "/lectures/from-file";
      }

      toast.loading("Generating study materials... this may take 30–90 seconds.", { id: "gen" });
      const result = await apiPostForm(endpoint, fd);
      toast.success("Study materials ready!", { id: "gen" });
      onCreated(result.lecture.id);
      onClose();
    } catch (e) {
      toast.error(e.message, { id: "gen" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-cream-darker">
          <h2 className="font-serif text-xl text-ink">New Lecture</h2>
          <button onClick={onClose} className="text-ink-light hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Step 1: Source type */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">1. Lecture source</label>
            <div className="grid grid-cols-3 gap-2">
              {SOURCE_TYPES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setSourceType(id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-xs font-medium transition-all ${
                    sourceType === id
                      ? "border-amber bg-amber-pale text-amber"
                      : "border-cream-darker text-ink-light hover:border-amber/40"
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Name */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">2. Lecture name</label>
            <input
              type="text"
              value={lectureName}
              onChange={(e) => setLectureName(e.target.value)}
              placeholder="e.g. Week 3: Sorting Algorithms"
              className="w-full px-4 py-2.5 rounded-xl border border-cream-darker bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-amber/40 text-sm"
            />
          </div>

          {/* Step 3: Subject */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">3. Subject folder</label>
            <select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                if (e.target.value !== "__new__") setNewSubjectName("");
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-cream-darker bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-amber/40 text-sm mb-2"
            >
              <option value="">— Select existing —</option>
              {subjects?.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              <option value="__new__">+ Create new subject</option>
            </select>
            {(subjectId === "__new__" || (!subjectId && !subjects?.length)) && (
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="Subject name (e.g. COMP1511)"
                className="w-full px-4 py-2.5 rounded-xl border border-cream-darker bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-amber/40 text-sm"
              />
            )}
          </div>

          {/* Content input based on source type */}
          {sourceType === "youtube" && (
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">YouTube URL</label>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-4 py-2.5 rounded-xl border border-cream-darker bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-amber/40 text-sm"
              />
            </div>
          )}

          {sourceType === "transcript" && (
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">Paste transcript</label>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste the lecture transcript here..."
                rows={6}
                className="w-full px-4 py-2.5 rounded-xl border border-cream-darker bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-amber/40 text-sm resize-none"
              />
            </div>
          )}

          {sourceType === "file" && (
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">Upload PDF or PPTX</label>
              <input
                type="file"
                accept=".pdf,.pptx"
                onChange={(e) => setFile(e.target.files[0])}
                className="w-full text-sm text-ink-light file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-pale file:text-amber file:font-semibold hover:file:bg-amber hover:file:text-white cursor-pointer"
              />
            </div>
          )}
{sourceType === "recording" && (
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">Record Lecture</label>
              <div className="flex flex-col items-center gap-4 p-6 bg-cream rounded-xl border border-cream-darker">
                {!recording && !audioBlob && (
                  <button
                    onClick={startRecording}
                    className="flex items-center gap-2 px-6 py-3 bg-amber text-white font-semibold rounded-xl hover:bg-amber-light transition-colors"
                  >
                    <Mic size={18} />
                    Start Recording
                  </button>
                )}
                {recording && (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                      <span className="font-mono text-lg font-bold text-ink">{formatTime(recordingTime)}</span>
                    </div>
                    <div className="flex gap-1 items-end h-8">
                      {Array.from({length: 12}).map((_, i) => (
                        <div
                          key={i}
                          className="w-1.5 bg-amber rounded-full animate-pulse"
                          style={{
                            height: `${Math.random() * 100}%`,
                            animationDelay: `${i * 0.1}s`
                          }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors"
                    >
                      <Square size={18} />
                      Stop Recording
                    </button>
                  </>
                )}
                {!recording && audioBlob && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
                      ✅ Recording ready — {formatTime(recordingTime)}
                    </div>
                    <button
                      onClick={() => { setAudioBlob(null); setRecordingTime(0); }}
                      className="text-xs text-ink-light hover:text-ink underline"
                    >
                      Record again
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 pt-0">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 bg-amber text-white font-semibold rounded-xl hover:bg-amber-light transition-colors disabled:opacity-60 text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="spinner" />
                Generating materials...
              </>
            ) : (
              "⚡ Generate Study Materials"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
