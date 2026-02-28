"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import toast from "react-hot-toast";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const EVENT_TYPES = [
  { id: "exam", label: "Exam", colour: "#c12e5a" },
  { id: "study", label: "Study Session", colour: "#c17b2e" },
  { id: "assignment", label: "Assignment Due", colour: "#2e7bc1" },
  { id: "revision", label: "Revision", colour: "#6b4fc8" },
];

export default function CalendarPage() {
  const [user, setUser] = useState(null);
  const [today] = useState(new Date());
  const [current, setCurrent] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [newEvent, setNewEvent] = useState({ title: "", type: "exam", date: "" });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { window.location.href = "/"; return; }
      setUser(session.user);
      loadEvents(session.user.id);
    });
  }, []);

  const loadEvents = async (uid) => {
    const { data } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", uid)
      .order("date", { ascending: true });
    setEvents(data || []);
  };

  const addEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.date) {
      toast.error("Please fill in all fields.");
      return;
    }
    const { error } = await supabase.from("calendar_events").insert({
      user_id: user.id,
      title: newEvent.title.trim(),
      type: newEvent.type,
      date: newEvent.date,
      colour: EVENT_TYPES.find(t => t.id === newEvent.type)?.colour || "#c17b2e",
    });
    if (error) { toast.error("Failed to save event."); return; }
    toast.success("Event added!");
    setNewEvent({ title: "", type: "exam", date: selectedDate || "" });
    setShowAdd(false);
    loadEvents(user.id);
  };

  const deleteEvent = async (id) => {
    await supabase.from("calendar_events").delete().eq("id", id);
    setEvents(e => e.filter(ev => ev.id !== id));
  };

  // Calendar grid
  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  const getEventsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter(e => e.date === dateStr);
  };

  const isToday = (day) => day && today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button onClick={() => window.location.href = "/"} className="flex items-center gap-2 text-ink-light hover:text-ink text-sm mb-6 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-3xl text-ink">Calendar</h1>
          <button
            onClick={() => { setShowAdd(true); setNewEvent(n => ({ ...n, date: "" })); }}
            className="flex items-center gap-2 px-4 py-2 bg-amber text-white font-semibold rounded-xl hover:bg-amber-light transition-colors text-sm"
          >
            <Plus size={16} /> Add Event
          </button>
        </div>

        {/* Add event modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-serif text-xl text-ink">Add Event</h2>
                <button onClick={() => setShowAdd(false)} className="text-ink-light hover:text-ink"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">Event title</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent(n => ({ ...n, title: e.target.value }))}
                    placeholder="e.g. MATH1131 Final Exam"
                    className="w-full px-4 py-2.5 rounded-xl border border-cream-darker bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-amber/40 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {EVENT_TYPES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setNewEvent(n => ({ ...n, type: t.id }))}
                        className={`px-3 py-2 rounded-xl border-2 text-sm font-medium transition-colors ${newEvent.type === t.id ? "border-amber bg-amber-pale text-amber" : "border-cream-darker text-ink-light hover:border-amber/40"}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">Date</label>
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent(n => ({ ...n, date: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-cream-darker bg-cream text-ink focus:outline-none focus:ring-2 focus:ring-amber/40 text-sm"
                  />
                </div>
                <button
                  onClick={addEvent}
                  className="w-full py-3 bg-amber text-white font-semibold rounded-xl hover:bg-amber-light transition-colors text-sm"
                >
                  Add Event
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white border border-cream-darker rounded-2xl p-6">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setCurrent(new Date(year, month - 1))} className="p-2 hover:bg-cream rounded-lg transition-colors">
                <ChevronLeft size={18} className="text-ink" />
              </button>
              <h2 className="font-serif text-xl text-ink">{MONTHS[month]} {year}</h2>
              <button onClick={() => setCurrent(new Date(year, month + 1))} className="p-2 hover:bg-cream rounded-lg transition-colors">
                <ChevronRight size={18} className="text-ink" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-ink-light py-2">{d}</div>
              ))}
            </div>

            {/* Cells */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                const dayEvents = getEventsForDay(day);
                return (
                  <div
                    key={i}
                    onClick={() => {
                      if (!day) return;
                      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      setSelectedDate(dateStr);
                      setNewEvent(n => ({ ...n, date: dateStr }));
                      setShowAdd(true);
                    }}
                    className={`min-h-[52px] p-1 rounded-xl cursor-pointer transition-colors ${
                      !day ? "" : isToday(day) ? "bg-amber text-white" : "hover:bg-cream"
                    }`}
                  >
                    {day && (
                      <>
                        <div className={`text-xs font-medium text-center mb-1 ${isToday(day) ? "text-white" : "text-ink"}`}>{day}</div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 2).map((ev, ei) => (
                            <div
                              key={ei}
                              className="text-white text-xs px-1 py-0.5 rounded truncate"
                              style={{ backgroundColor: ev.colour }}
                            >
                              {ev.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-xs text-ink-light text-center">+{dayEvents.length - 2}</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming events */}
          <div className="bg-white border border-cream-darker rounded-2xl p-6">
            <h3 className="font-serif text-lg text-ink mb-4">Upcoming</h3>
            {events.length === 0 ? (
              <p className="text-ink-light text-sm text-center py-8">No events yet. Add your exam dates!</p>
            ) : (
              <div className="space-y-3">
                {events
                  .filter(e => e.date >= today.toISOString().split("T")[0])
                  .slice(0, 10)
                  .map((ev, i) => (
                    <div key={i} className="flex items-start gap-3 group">
                      <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: ev.colour }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-ink text-sm font-medium truncate">{ev.title}</p>
                        <p className="text-xs text-ink-light">{new Date(ev.date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</p>
                      </div>
                      <button
                        onClick={() => deleteEvent(ev.id)}
                        className="opacity-0 group-hover:opacity-100 text-ink-light hover:text-red-500 transition-all"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}