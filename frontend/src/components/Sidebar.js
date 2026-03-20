"use client";
import { useState } from "react";
import { BookOpen, FolderOpen, ChevronRight, Plus, Library, ChevronLeft, Settings } from "lucide-react";

export default function Sidebar({ subjects, lectures, selectedSubject, onSelectSubject, onSelectLecture, selectedLectureId, onNewLecture, onLibrary, user }) {
  const [collapsed, setCollapsed] = useState(false);
  const recentLectures = lectures?.slice(0, 8) || [];

  if (collapsed) {
    return (
      <aside className="w-12 flex-shrink-0 bg-white border-r border-cream-darker flex flex-col items-center py-4 gap-3">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 hover:bg-cream rounded-lg transition-colors text-ink-light hover:text-ink"
        >
          <ChevronRight size={16} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-60 flex-shrink-0 bg-white border-r border-cream-darker flex flex-col h-full">
      {/* Top actions */}
      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-ink-light uppercase tracking-widest">Menu</span>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 hover:bg-cream rounded-lg transition-colors text-ink-light hover:text-ink"
          >
            <ChevronLeft size={15} />
          </button>
        </div>
        <button
          onClick={onNewLecture}
          className="flex items-center gap-2 w-full px-3 py-2 bg-amber text-white rounded-lg text-sm font-semibold hover:bg-amber-light transition-colors"
        >
          <Plus size={14} />
          New Lecture
        </button>
        <button
          onClick={onLibrary}
          className="flex items-center gap-2 w-full px-3 py-2 bg-cream border border-cream-darker text-ink rounded-lg text-sm font-semibold hover:bg-cream-darker transition-colors"
        >
          <Library size={14} />
          My Library
        </button>
      </div>

      <div className="border-t border-cream-darker" />

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
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.colour || "#c17b2e" }} />
            <span className="truncate">{s.name}</span>
          </button>
        ))}
      </div>

      <div className="border-t border-cream-darker" />

      {/* Recent lectures */}
      <div className="p-4 flex-1 overflow-y-auto">
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

      <div className="border-t border-cream-darker" />

      {/* User section */}
      <div className="p-4">
        
          href="/settings"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-ink hover:bg-cream transition-colors"
        >
          <Settings size={14} />
          Settings
        </a>
        <p className="text-xs text-ink-light truncate px-3 mt-1">{user?.email}</p>
      </div>
    </aside>
  );
}