"use client";
import { Trash2, ChevronRight, FolderOpen } from "lucide-react";
import { apiDelete } from "@/lib/api";
import toast from "react-hot-toast";

export default function Library({ lectures, subjects, selectedSubject, onSelect, onDelete }) {
  const filtered = selectedSubject
    ? lectures?.filter((l) => l.subject_id === selectedSubject)
    : lectures;

  const deleteLecture = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Delete this lecture and all its study materials?")) return;
    try {
      await apiDelete(`/lectures/${id}`);
      toast.success("Lecture deleted.");
      onDelete?.();
    } catch {
      toast.error("Failed to delete lecture.");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-serif text-2xl text-ink mb-6">
          {selectedSubject
            ? subjects?.find((s) => s.id === selectedSubject)?.name || "Subject"
            : "All Lectures"}
        </h2>

        {!filtered?.length ? (
          <div className="text-center py-20 text-ink-light">
            <FolderOpen size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No lectures yet</p>
            <p className="text-sm mt-1">Click "New Lecture" to get started</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((l) => (
              <div
                key={l.id}
                onClick={() => onSelect(l.id)}
                className="bg-white border border-cream-darker rounded-xl p-5 flex items-center gap-4 cursor-pointer hover:border-amber/40 hover:shadow-sm transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {l.subjects && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold text-white"
                        style={{ backgroundColor: l.subjects.colour || "#c17b2e" }}
                      >
                        {l.subjects.name}
                      </span>
                    )}
                    <span className="text-xs text-ink-light capitalize">{l.source_type}</span>
                  </div>
                  <h3 className="font-medium text-ink text-sm truncate">{l.title}</h3>
                  <p className="text-xs text-ink-light mt-0.5">
                    {new Date(l.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => deleteLecture(e, l.id)}
                    className="p-1.5 text-ink-light hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={15} />
                  </button>
                  <ChevronRight size={16} className="text-ink-light group-hover:text-amber transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
