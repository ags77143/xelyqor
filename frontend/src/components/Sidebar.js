"use client";
import { useState } from "react";
import { Plus, BookOpen, Lightbulb, Library, MoreHorizontal, Trash2, ExternalLink, Menu, X, ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function Sidebar({
  subjects, onSelectSubject, onNewLecture, onLibrary, user,
  userSettings, onDeleteSubject, onDeleteLecture, selectedSubject
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);

  const deleteSubject = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Delete this subject? Lectures will be unassigned.")) return;
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) { toast.error("Failed to delete subject."); return; }
    toast.success("Subject deleted.");
    onDeleteSubject?.();
    setOpenMenu(null);
  };

  if (collapsed) {
    return (
      <div className="w-14 flex-shrink-0 border-r border-cream-darker bg-white flex flex-col h-screen items-center py-4 gap-4">
        <button onClick={() => setCollapsed(false)} className="p-2 rounded-lg hover:bg-cream transition-colors text-ink-light hover:text-ink">
          <Menu size={18} />
        </button>
        <button onClick={onNewLecture} className="p-2 rounded-lg bg-amber text-white hover:bg-amber-light transition-colors" title="New Lecture">
          <Plus size={18} />
        </button>
        <button onClick={onLibrary} className="p-2 rounded-lg hover:bg-cream transition-colors text-ink-light hover:text-ink" title="My Library">
          <Library size={18} />
        </button>
        <button onClick={() => window.location.href = "/solver"} className="p-2 rounded-lg hover:bg-cream transition-colors text-ink-light hover:text-ink" title="Solver">
          <Lightbulb size={18} />
        </button>
        <div className="flex-1" />
        <button onClick={() => window.location.href = "/calendar"} className="p-2 rounded-lg hover:bg-cream transition-colors text-ink-light hover:text-ink" title="Calendar">
          📅
        </button>
        <button onClick={() => window.location.href = "/settings"} className="p-2 rounded-lg hover:bg-cream transition-colors text-ink-light hover:text-ink" title="Settings">
          ⚙️
        </button>
        <button
          onClick={() => supabase.auth.signOut().then(() => window.location.href = "/")}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: userSettings?.avatar_colour || "#c17b2e" }}
          title="Sign out"
        >
          {(userSettings?.display_name || user?.email || "?")[0].toUpperCase()}
        </button>
      </div>
    );
  }

  return (
    <div className="w-56 flex-shrink-0 border-r border-cream-darker bg-white flex flex-col h-screen" onClick={() => setOpenMenu(null)}>
      {/* Logo + collapse */}
      <div className="px-4 py-4 border-b border-cream-darker flex items-center justify-between flex-shrink-0">
        <h1 className="font-serif text-xl text-ink"><span className="text-amber">X</span>elyqor</h1>
        <button onClick={() => setCollapsed(true)} className="p-1.5 rounded-lg hover:bg-cream transition-colors text-ink-light hover:text-ink">
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-3 border-b border-cream-darker flex-shrink-0">
        <input
          type="text"
          placeholder="Search lectures..."
          className="w-full px-3 py-2 rounded-lg border border-cream-darker bg-cream text-ink text-xs focus:outline-none focus:ring-2 focus:ring-amber/40"
        />
      </div>

      {/* Nav items */}
      <div className="px-3 py-2 border-b border-cream-darker space-y-1 flex-shrink-0">
        <button
          onClick={onNewLecture}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-semibold bg-amber text-white hover:bg-amber-light transition-colors"
        >
          <Plus size={14} /> New Lecture
        </button>
        <button
          onClick={onLibrary}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-ink hover:bg-cream transition-colors"
        >
          <Library size={14} className="text-ink-light" /> My Library
        </button>
        <button
          onClick={() => window.location.href = "/solver"}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-ink hover:bg-cream transition-colors"
        >
          <Lightbulb size={14} className="text-ink-light" /> Solver
        </button>
      </div>

      {/* Subjects — scrollable */}
      <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
        <p className="text-xs font-semibold text-ink-light uppercase tracking-widest mb-2 px-1">Subjects</p>
        {subjects?.length === 0 && <p className="text-xs text-ink-light px-1">No subjects yet.</p>}
        {subjects?.map((s) => (
          <div key={s.id} className="relative mb-0.5">
            <div
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer group ${selectedSubject === s.id ? "bg-amber-pale text-amber font-semibold" : "text-ink hover:bg-cream"}`}
              onClick={() => onSelectSubject(s.id)}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.colour || "#c17b2e" }} />
              <span className="truncate flex-1">{s.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === `s-${s.id}` ? null : `s-${s.id}`); }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-cream-darker transition-all flex-shrink-0"
              >
                <MoreHorizontal size={13} />
              </button>
            </div>
            {openMenu === `s-${s.id}` && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-cream-darker rounded-xl shadow-lg p-1 z-30 w-44" onClick={e => e.stopPropagation()}>
              <button
                onClick={(e) => deleteSubject(e, s.id)}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={12} /> Delete Subject
              </button>
            </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom nav — always visible */}
      <div className="px-3 py-3 border-t border-cream-darker flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => window.location.href = "/calendar"}
          className="flex-1 flex items-center justify-center py-2 rounded-lg text-ink-light hover:text-ink hover:bg-cream transition-colors text-xs gap-1.5"
        >
          📅 Calendar
        </button>
        <button
          onClick={() => window.location.href = "/settings"}
          className="p-2 rounded-lg text-ink-light hover:text-ink hover:bg-cream transition-colors"
          title="Settings"
        >
          ⚙️
        </button>
        <button
          onClick={() => supabase.auth.signOut().then(() => window.location.href = "/")}
          title="Sign out"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: userSettings?.avatar_colour || "#c17b2e" }}
          >
            {(userSettings?.display_name || user?.email || "?")[0].toUpperCase()}
          </div>
        </button>
      </div>
    </div>
  );
}