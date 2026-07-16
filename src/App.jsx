import React, { useState } from "react";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import LoginPage from "./auth/LoginPage";
import { DataProvider, useData } from "./data/DataProvider";
import { isSupabaseConfigured } from "./lib/supabase";
import { Sidebar, MobileTopBar, BottomNav, TopBar } from "./layout/Layout";
import GlobalSearch from "./components/GlobalSearch";
import DashboardView from "./views/DashboardView";
import ProjectsView from "./views/ProjectsView";
import ScheduleView from "./views/ScheduleView";
import BudgetView from "./views/BudgetView";
import TeamView from "./views/TeamView";
import ReportsView from "./views/ReportsView";
import AdminView from "./views/AdminView";
import ProjectDetail from "./views/ProjectDetail";

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
.f-display { font-family: 'Oswald', sans-serif; }
.f-body { font-family: 'Inter', sans-serif; }
.f-mono { font-family: 'IBM Plex Mono', monospace; }
`;

const TITLES = {
  dashboard: "Dashboard",
  projects: "Projects",
  schedule: "Schedule",
  budget: "Budget",
  team: "Team",
  reports: "Reports",
  admin: "Admin",
};

function DashboardShell() {
  const [view, setView] = useState("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [initialTab, setInitialTab] = useState(null);
  const { projects, loading, error } = useData();
  const { isAdmin } = useAuth();

  const goProject = (id) => { setSelectedProjectId(id); setInitialTab(null); };
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const handleNavigate = ({ view: v, projectId, tab }) => {
    if (projectId) {
      setSelectedProjectId(projectId);
      setInitialTab(tab || null);
    } else {
      setView(v);
      setSelectedProjectId(null);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row h-screen bg-stone-100 f-body" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>
      <Sidebar view={view} setView={setView} setSelectedProject={setSelectedProjectId} />
      <MobileTopBar onSelectHome={() => { setView("dashboard"); setSelectedProjectId(null); }} />
      <div className="flex-1 overflow-y-auto pb-14 sm:pb-0">
        {loading ? (
          <div className="flex items-center justify-center h-full f-body text-sm text-stone-400">Loading portfolio…</div>
        ) : error ? (
          <div className="flex items-center justify-center h-full f-body text-sm text-red-600 px-8 text-center">{error}</div>
        ) : selectedProject ? (
          <ProjectDetail
            key={`${selectedProject.id}-${initialTab || ""}`}
            project={selectedProject}
            back={() => setSelectedProjectId(null)}
            initialTab={initialTab}
          />
        ) : (
          <>
            <TopBar title={TITLES[view]} right={<GlobalSearch onNavigate={handleNavigate} />} />
            {view === "dashboard" && <DashboardView goProject={goProject} />}
            {view === "projects" && <ProjectsView goProject={goProject} />}
            {view === "schedule" && <ScheduleView goProject={goProject} />}
            {view === "budget" && <BudgetView goProject={goProject} />}
            {view === "team" && <TeamView />}
            {view === "reports" && <ReportsView goProject={goProject} />}
            {view === "admin" && isAdmin && <AdminView />}
          </>
        )}
      </div>
      <BottomNav view={view} setView={setView} setSelectedProject={setSelectedProjectId} />
    </div>
  );
}

function AuthGate() {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center f-body text-sm text-stone-400">Loading…</div>;
  }
  if (!session) {
    return <LoginPage />;
  }
  return (
    <DataProvider>
      <DashboardShell />
    </DataProvider>
  );
}

export default function App() {
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 f-body p-8">
        <div className="max-w-md text-center space-y-2">
          <h1 className="f-display text-xl text-stone-900">Supabase not configured</h1>
          <p className="f-body text-sm text-stone-500">
            Copy <code className="f-mono bg-stone-200 px-1 rounded">.env.local.example</code> to{" "}
            <code className="f-mono bg-stone-200 px-1 rounded">.env.local</code>, fill in your Supabase project URL and anon key, and restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
