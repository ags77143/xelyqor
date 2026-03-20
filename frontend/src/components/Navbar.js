"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { LogOut } from "lucide-react";

export default function Navbar({ user }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <nav className="h-14 bg-white border-b border-cream-darker flex items-center px-6 z-50 sticky top-0">
      <div className="font-serif text-2xl font-bold text-ink flex-shrink-0">
        <span className="text-amber">I</span>nqlo
      </div>
      <div className="flex-1" />
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-sm text-ink-light hover:text-ink transition-colors max-w-[180px] truncate"
        >
          {user?.email}
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 bg-white border border-cream-darker rounded-xl shadow-lg p-1 min-w-[140px] z-50">
            
              href="/settings"
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-ink hover:bg-cream rounded-lg transition-colors"
            >
              Settings
            </a>
            <button
              onClick={signOut}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-ink hover:bg-cream rounded-lg transition-colors"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}