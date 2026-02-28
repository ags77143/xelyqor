"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { apiGet } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import Library from "@/components/Library";
import LectureView from "@/components/LectureView";
import SubjectView from "@/components/SubjectView";
import NewLectureModal from "@/components/NewLectureModal";
import ChatPanel from "@/components/ChatPanel";

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedLectureId, setSelectedLectureId] = useState(null);
  const [showNewLecture, setShowNewLecture] = useState(false);
  const [view, setView] = useState("library"); // library | lecture | subject
  const [userSettings, setUserSettings] = useState({ chatbot_name: "Tutor", chatbot_tone: "friendly", avatar_colour: "#c17b2e", display_name: "" });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { window.location.href = "/auth"; return; }
      setUser(session.user);
      try {
        const s = await apiGet(`/settings/${session.user.id}`);
        setUserSettings(s);
      } catch (e) {}
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

  const openSubject = (id) => {
    setSelectedSubject(id);
    setView("subject");
    setSelectedLectureId(null);
  };

  const openLibrary = () => {
    setView("library");
    setSelectedLectureId(null);
    setSelectedSubject(null);
  };

  const currentLecture = lectures?.find(l => l.id === selectedLectureId);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-cream">
      <Sidebar
        subjects={subjects}
        lectures={lectures}
        selectedSubject={selectedSubject}
        onSelectSubject={openSubject}
        onSelectLecture={openLecture}
        selectedLectureId={selectedLectureId}
        onNewLecture={() => setShowNewLecture(true)}
        onLibrary={openLibrary}
        user={user}
        userSettings={userSettings}
        onDeleteSubject={loadData}
        onDeleteLecture={() => { openLibrary(); loadData(); }}
      />

      <main className="flex-1 flex min-w-0 overflow-hidden" style={{ height: "100vh" }}>
        {view === "library" && (
          <Library
            lectures={lectures}
            subjects={subjects}
            selectedSubject={selectedSubject}
            onSelect={openLecture}
            onDelete={loadData}
          />
        )}
        {view === "subject" && selectedSubject && (
          <SubjectView
            subjectId={selectedSubject}
            user={user}
            onSelectLecture={openLecture}
          />
        )}
        {view === "lecture" && selectedLectureId && (
          <LectureView
            lectureId={selectedLectureId}
            user={user}
            subjects={subjects}
            onDelete={() => { openLibrary(); loadData(); }}
            onMoved={loadData}
          />
        )}
      </main>

      <ChatPanel
        lectureId={selectedLectureId}
        lectureName={currentLecture?.title}
        chatbotName={userSettings.chatbot_name}
        chatbotTone={userSettings.chatbot_tone}
      />

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