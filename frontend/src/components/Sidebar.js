"use client";
import { BookOpen, FolderOpen, ChevronRight } from "lucide-react";

export default function Sidebar({ subjects, lectures, selectedSubject, onSelectSubject, onSelectLecture, selectedLectureId }) {
  const recentLectures = lectures?.slice(0, 8) || [];

  return (
    <aside className="w-60 flex-shrink-0 bg-white border-r border-cream-darker flex flex-col h-full overflow-y-auto">
      {/* Subjects */}
      <div className="p-4">
        <p className="text-xs font-semibold text-ink-light uppercase tracking-widest mb-3">Subjects</p>
        <button
          onClick={() => onSelectSubject(null)}
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
            !selectedSubject ? "bg-amber-pale text-amber font-semibold" : "text-ink hover:bg-cream"
          }`}
        >
          <BookOpen size={14} />
          All Lectures
        </button>
        {subjects?.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelectSubject(s.id)}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
              selectedSubject === s.id ? "bg-amber-pale text-amber font-semibold" : "text-ink hover:bg-cream"
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: s.colour || "#c17b2e" }}
            />
            <span className="truncate">{s.name}</span>
          </button>
        ))}
      </div>

      <div className="border-t border-cream-darker" />

      {/* Recent lectures */}
      <div className="p-4 flex-1">
        <p className="text-xs font-semibold text-ink-light uppercase tracking-widest mb-3">Recent</p>
        {recentLectures.map((l) => (
          <button
            key={l.id}
            onClick={() => onSelectLecture(l.id)}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors mb-1 text-left group ${
              selectedLectureId === l.id ? "bg-amber-pale text-amber font-semibold" : "text-ink hover:bg-cream"
            }`}
          >
            <FolderOpen size={13} className="flex-shrink-0 opacity-60" />
            <span className="truncate flex-1 text-xs">{l.title}</span>
            <ChevronRight size={12} className="flex-shrink-0 opacity-0 group-hover:opacity-50 transition-opacity" />
          </button>
        ))}
      </div>
    </aside>
  );
}
