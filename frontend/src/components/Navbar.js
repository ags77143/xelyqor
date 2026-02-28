"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { apiGet } from "@/lib/api";
import { Plus, Library, LogOut, Lightbulb, Settings, Calendar } from "lucide-react";

export default function Navbar({ onNew, onLibrary }) {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        try {
          const s = await apiGet(`/settings/${session.user.id}`);
          setSettings(s);
        } catch (e) {}
      }
    });
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <nav className="h-14 bg-white border-b border-cream-darker flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-6">
        <h1 className="font-serif text-xl text-ink">
          <span className="text-amber">X</span>elyqor
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={onNew}
            className="flex items-center gap-2 px-4 py-1.5 bg-amber text-white rounded-lg text-sm font-semibold hover:bg-amber-light transition-colors"
          >
            <Plus size={15} />
            New Lecture
          </button>
          <button
            onClick={onLibrary}
            className="flex items-center gap-2 px-4 py-1.5 bg-cream border border-cream-darker text-ink rounded-lg text-sm font-semibold hover:bg-cream-darker transition-colors"
          >
            <Library size={15} />
            My Library
          </button>
          <button
            onClick={() => window.location.href = "/solver"}
            className="flex items-center gap-2 px-4 py-1.5 bg-cream border border-cream-darker text-ink rounded-lg text-sm font-semibold hover:bg-cream-darker transition-colors"
          >
            <Lightbulb size={15} />
            Solver
          </button>
          <button
            onClick={() => window.location.href = "/calendar"}
            className="flex items-center gap-2 px-4 py-1.5 bg-cream border border-cream-darker text-ink rounded-lg text-sm font-semibold hover:bg-cream-darker transition-colors"
          >
            <Calendar size={15} />
            Calendar
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => window.location.href = "/settings"}
          className="flex items-center gap-2 px-3 py-1.5 bg-cream border border-cream-darker text-ink rounded-lg text-sm hover:bg-cream-darker transition-colors"
        >
          <Settings size={14} />
        </button>
        {user && (
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: settings?.avatar_colour || "#c17b2e" }}
            >
              {(settings?.display_name || user.email || "?")[0].toUpperCase()}
            </div>
            <span className="text-sm text-ink-light hidden md:block truncate max-w-32">
              {settings?.display_name || user.email}
            </span>
          </div>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-2 px-3 py-1.5 text-ink-light hover:text-ink text-sm transition-colors"
        >
          <LogOut size={14} />
        </button>
      </div>
    </nav>
  );
}