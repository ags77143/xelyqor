"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";

const GAMES = [
  { id: "memory", icon: "🃏", name: "Memory cards", desc: "Flip and match terms" },
  { id: "quizblitz", icon: "⚡", name: "Quiz blitz", desc: "Timed MCQ attack" },
  { id: "cloze", icon: "✏️", name: "Cloze", desc: "Fill the blanks" },
  { id: "truefalse", icon: "↔️", name: "True or false", desc: "Swipe to decide" },
  { id: "wordsearch", icon: "🔍", name: "Wordsearch", desc: "Find key terms" },
  { id: "crossword", icon: "📐", name: "Crossword", desc: "Clues from concepts" },
  { id: "anagram", icon: "🔀", name: "Anagram", desc: "Unscramble terms" },
  { id: "jeopardy", icon: "🏆", name: "Jeopardy", desc: "Pick and answer" },
];

const STORY_GENRES = [
  { id: "anime", icon: "⚔️", name: "Anime" },
  { id: "scifi", icon: "🚀", name: "Sci-fi" },
  { id: "fantasy", icon: "🧙", name: "Fantasy" },
  { id: "crime", icon: "🔎", name: "Crime thriller" },
  { id: "horror", icon: "👻", name: "Horror" },
  { id: "historical", icon: "📜", name: "Historical" },
];

export default function StudyDrawer({ open, onClose, lectureName, subjectName, initialTab = "games", onLaunch }) {
  const [tab, setTab] = useState(initialTab);
  const [scope, setScope] = useState("lecture");
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState(null);

  useEffect(() => {
    setTab(initialTab);
    setSelectedGame(null);
    setSelectedGenre(null);
  }, [initialTab, open]);

  if (!open) return null;

  const handleStart = () => {
    if (tab === "games" && selectedGame) {
      onLaunch({ type: "game", mode: selectedGame, scope });
    } else if (tab === "story" && selectedGenre) {
      onLaunch({ type: "story", genre: selectedGenre, scope });
    }
  };

  const canStart = tab === "games" ? !!selectedGame : !!selectedGenre;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white rounded-t-2xl shadow-xl"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: "85vh", overflowY: "auto" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-cream-darker" />
        </div>

        <div className="flex items-start justify-between px-6 py-4 border-b border-cream-darker">
          <div>
            <h2 className="font-serif text-xl text-ink">Study mode</h2>
            <p className="text-xs text-ink-light mt-0.5 truncate">{lectureName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-cream rounded-lg transition-colors">
            <X size={16} className="text-ink-light" />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => { setTab("games"); setSelectedGame(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "games" ? "bg-amber text-white" : "bg-cream text-ink hover:bg-cream-darker"}`}
            >
              Games
            </button>
            <button
              onClick={() => { setTab("story"); setSelectedGenre(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "story" ? "bg-amber text-white" : "bg-cream text-ink hover:bg-cream-darker"}`}
            >
              Story mode
            </button>
          </div>

          <div className="mb-5">
            <p className="text-xs font-semibold text-ink-light uppercase tracking-widest mb-2">Cover</p>
            <div className="flex gap-2">
              {[
                { id: "lecture", label: "This lecture" },
                { id: "subject", label: "Whole subject" },
                { id: "custom", label: "Custom" },
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setScope(s.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${scope === s.id ? "bg-ink text-white border-ink" : "border-cream-darker text-ink-light hover:border-ink-light"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {tab === "games" && (
            <div>
              <p className="text-xs font-semibold text-ink-light uppercase tracking-widest mb-3">Pick a game</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {GAMES.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGame(g.id)}
                    className={`flex flex-col items-start p-3 rounded-xl border transition-all text-left ${selectedGame === g.id ? "border-amber bg-amber-pale" : "border-cream-darker hover:border-ink-light bg-white"}`}
                  >
                    <span className="text-xl mb-2">{g.icon}</span>
                    <span className={`text-sm font-medium ${selectedGame === g.id ? "text-amber" : "text-ink"}`}>{g.name}</span>
                    <span className="text-xs text-ink-light mt-0.5">{g.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "story" && (
            <div>
              <p className="text-xs font-semibold text-ink-light uppercase tracking-widest mb-1">Format</p>
              <div className="flex gap-2 mb-5">
                <div className="flex-1 border border-amber bg-amber-pale rounded-xl p-3">
                  <div className="text-sm font-medium text-amber">Light novel</div>
                  <div className="text-xs text-ink-light mt-0.5">Free — beautiful ebook style</div>
                </div>
                <div className="flex-1 border border-cream-darker rounded-xl p-3 opacity-50">
                  <div className="text-sm font-medium text-ink">Comic panels</div>
                  <div className="text-xs text-ink-light mt-0.5">Pro — illustrated frames</div>
                </div>
                <div className="flex-1 border border-cream-darker rounded-xl p-3 opacity-50">
                  <div className="text-sm font-medium text-ink">Cinematic</div>
                  <div className="text-xs text-ink-light mt-0.5">Pro — full screen scenes</div>
                </div>
              </div>

              <p className="text-xs font-semibold text-ink-light uppercase tracking-widest mb-3">Pick a genre</p>
              <div className="grid grid-cols-3 gap-2">
                {STORY_GENRES.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGenre(g.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${selectedGenre === g.id ? "border-amber bg-amber-pale" : "border-cream-darker hover:border-ink-light bg-white"}`}
                  >
                    <span className="text-lg">{g.icon}</span>
                    <span className={`text-sm font-medium ${selectedGenre === g.id ? "text-amber" : "text-ink"}`}>{g.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={!canStart}
            className="w-full mt-6 py-3 bg-amber text-white font-semibold rounded-xl hover:bg-amber-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {tab === "games"
              ? (selectedGame ? `Start ${GAMES.find(g => g.id === selectedGame)?.name}` : "Select a game to start")
              : (selectedGenre ? `Start story — ${STORY_GENRES.find(g => g.id === selectedGenre)?.name}` : "Select a genre to start")}
          </button>
        </div>
      </div>
    </div>
  );
}