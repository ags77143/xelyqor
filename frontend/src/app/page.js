"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { apiGet } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Library from "@/components/Library";
import LectureView from "@/components/LectureView";
import NewLectureModal from "@/components/NewLectureModal";

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedLectureId, setSelectedLectureId] = useState(null);
  const [showNewLecture, setShowNewLecture] = useState(false);
  const [view, setView] = useState("library");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = "/auth";
        return;
      }
      setUser(session.user);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) window.location.href = "/auth";
      else setUser(session.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [subs, lecs] = await Promise.all([
        apiGet(`/subjects/?user_id=${user.id}`),
        apiGet(`/lectures/?user_id=${user.id}`),
      ]);
      setSubjects(subs);
      setLectures(lecs);
    } catch (e) {
      console.error("Failed to load data:", e);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  const openLecture = (id) => {
    setSelectedLectureId(id);
    setView("lecture");
  };

  const openLibrary = () => {
    setView("library");
    setSelectedLectureId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Navbar user={user} />
      <div className="flex flex-1 min-h-0" style={{ height: "calc(100vh - 56px)" }}>
        <Sidebar
          subjects={subjects}
          lectures={lectures}
          selectedSubject={selectedSubject}
          onSelectSubject={(id) => { setSelectedSubject(id); setView("library"); setSelectedLectureId(null); }}
          onSelectLecture={openLecture}
          selectedLectureId={selectedLectureId}
          onNewLecture={() => setShowNewLecture(true)}
          onLibrary={openLibrary}
          user={user}
        />
        <main className="flex-1 flex min-w-0 overflow-hidden">
          {view === "library" || !selectedLectureId ? (
            <Library
              lectures={lectures}
              subjects={subjects}
              selectedSubject={selectedSubject}
              onSelect={openLecture}
              onDelete={loadData}
            />
          ) : (
            <LectureView
              lectureId={selectedLectureId}
              user={user}
              subjects={subjects}
              onDelete={() => { openLibrary(); loadData(); }}
              onMoved={loadData}
            />
          )}
        </main>
      </div>
      {showNewLecture && (
        <NewLectureModal
          subjects={subjects}
          user={user}
          onClose={() => setShowNewLecture(false)}
          onCreated={(id) => { loadData(); openLecture(id); }}
        />
      )}
    </div>
  );
}