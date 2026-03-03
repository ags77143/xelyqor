"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { apiGet, apiPost } from "@/lib/api";
import { ArrowLeft, Save, Upload } from "lucide-react";
import toast from "react-hot-toast";

const TONES = [
  { id: "friendly", label: "Friendly", desc: "Warm, conversational, keeps it simple" },
  { id: "strict", label: "Strict", desc: "Direct, concise, no hand-holding" },
  { id: "socratic", label: "Socratic", desc: "Asks questions to guide your thinking" },
];

const COLOURS = ["#c17b2e", "#2e7bc1", "#6b4fc8", "#2ec17b", "#c12e5a", "#c18b2e", "#2ec1b0", "#e07b39"];

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [chatBgPreview, setChatBgPreview] = useState(null);
  const [settings, setSettings] = useState({
    display_name: "",
    avatar_colour: "#c17b2e",
    chatbot_name: "Tutor",
    chatbot_tone: "friendly",
    chat_bg: null,
  });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { window.location.href = "/"; return; }
      setUser(session.user);
      try {
        const data = await apiGet(`/settings/${session.user.id}`);
        setSettings({
          display_name: data.display_name || "",
          avatar_colour: data.avatar_colour || "#c17b2e",
          chatbot_name: data.chatbot_name || "Tutor",
          chatbot_tone: data.chatbot_tone || "friendly",
          chat_bg: data.chat_bg || null,
        });
        if (data.chat_bg) setChatBgPreview(data.chat_bg);
      } catch (e) {}
      setLoading(false);
    });
  }, []);

  const handleBgUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setChatBgPreview(dataUrl);
      setSettings(s => ({ ...s, chat_bg: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiPost("/settings/", { user_id: user.id, ...settings });
      toast.success("Settings saved!");
    } catch (e) {
      toast.error("Failed to save: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
    </div>
  );

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <button onClick={() => window.location.href = "/"} className="flex items-center gap-2 text-ink-light hover:text-ink text-sm mb-6 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        <h1 className="font-serif text-3xl text-ink mb-8">Settings</h1>

        <div className="space-y-6">
          {/* Profile */}
          <div className="bg-white border border-cream-darker rounded-2xl p-6">
            <h2 className="font-serif text-xl text-ink mb-5">Profile</h2>
            <div className="flex items-center gap-4 mb-6">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
                style={{ backgroundColor: settings.avatar_colour }}
              >
                {(settings.display_name || user?.email || "?")[0].toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-ink text-sm">{settings.display_name || user?.email}</p>
                <p className="text-xs text-ink-light">{user?.email}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Display name</label>
                <input
                  type="text"
                  value={settings.display_name}
                  onChange={(e) => setSettings(s => ({ ...s, display_name: e.target.value }))}
                  placeholder="Your name"
                  className="w-full px-4 py-2.5 rounded-xl border border-cream-darker bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-amber/40 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-3">Avatar colour</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOURS.map(c => (
                    <button
                      key={c}
                      onClick={() => setSettings(s => ({ ...s, avatar_colour: c }))}
                      className="w-8 h-8 rounded-lg transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c,
                        outline: settings.avatar_colour === c ? `3px solid ${c}` : "none",
                        outlineOffset: "2px"
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Chatbot */}
          <div className="bg-white border border-cream-darker rounded-2xl p-6">
            <h2 className="font-serif text-xl text-ink mb-5">AI Tutor</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Tutor name</label>
                <input
                  type="text"
                  value={settings.chatbot_name}
                  onChange={(e) => setSettings(s => ({ ...s, chatbot_name: e.target.value }))}
                  placeholder="e.g. Alex, Tutor, Professor..."
                  className="w-full px-4 py-2.5 rounded-xl border border-cream-darker bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-amber/40 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-3">Teaching tone</label>
                <div className="space-y-2">
                  {TONES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSettings(s => ({ ...s, chatbot_tone: t.id }))}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                        settings.chatbot_tone === t.id
                          ? "border-amber bg-amber-pale"
                          : "border-cream-darker hover:border-amber/40"
                      }`}
                    >
                      <p className="font-semibold text-ink text-sm">{t.label}</p>
                      <p className="text-xs text-ink-light mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Chat background image</label>
                <p className="text-xs text-ink-light mb-3">Shown before your first message in the chat panel.</p>
                <div className="flex items-start gap-4">
                  {chatBgPreview && (
                    <div className="relative">
                      <img src={chatBgPreview} alt="Chat background" className="w-24 h-24 object-cover rounded-xl border border-cream-darker" />
                      <button
                        onClick={() => { setChatBgPreview(null); setSettings(s => ({ ...s, chat_bg: null })); }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                      >×</button>
                    </div>
                  )}
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-cream border border-cream-darker rounded-xl text-sm text-ink cursor-pointer hover:bg-cream-darker transition-colors">
                    <Upload size={14} />
                    {chatBgPreview ? "Change image" : "Upload image"}
                    <input type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="w-full py-3 bg-amber text-white font-semibold rounded-xl hover:bg-amber-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <><div className="spinner" /> Saving...</> : <><Save size={16} /> Save Settings</>}
          </button>
        </div>
      </div>
    </div>
  );
}