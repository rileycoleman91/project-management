import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
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
import MaterialsView from "./views/MaterialsView";
import TeamView from "./views/TeamView";
import ReportsView from "./views/ReportsView";
import AdminView from "./views/AdminView";
import ProjectDetail from "./views/ProjectDetail";
import { VIEW_PATHS, projectPath, slugToTab } from "./lib/routes";

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
  materials: "Materials",
  team: "Team",
  reports: "Reports",
  admin: "Admin",
};

// Looks up the project named by the :projectId URL param and renders its
// detail page. A tab click inside ProjectDetail pushes the tab's slug into
// the URL (via onTabChange) so refreshing mid-tab, or using browser
// back/forward, lands you back exactly where you were.
function ProjectDetailRoute() {
  const { projectId, tabSlug } = useParams();
  const { projects } = useData();
  const navigate = useNavigate();
  const project = projects.find((p) => p.id === projectId);

  if (!project) return <Navigate to="/projects" replace />;

  return (
    <ProjectDetail
      key={`${projectId}-${tabSlug || ""}`}
      project={project}
      initialTab={tabSlug ? slugToTab(tabSlug) : null}
      onTabChange={(tab) => navigate(projectPath(projectId, tab), { replace: true })}
      back={() => navigate(-1)}
    />
  );
}

function DashboardShell() {
  const { projects, loading, error } = useData();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const goProject = (id, tab) => navigate(projectPath(id, tab));

  const handleNavigate = ({ view: v, projectId, tab }) => {
    if (projectId) {
      goProject(projectId, tab);
    } else {
      navigate(VIEW_PATHS[v] || "/");
    }
  };

  const withTopBar = (title, view) => (
    <>
      <TopBar title={title} right={<GlobalSearch onNavigate={handleNavigate} />} />
      {view}
    </>
  );

  return (
    <div className="flex flex-col sm:flex-row h-screen bg-stone-100 f-body" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>
      <Sidebar />
      <MobileTopBar />
      <div className="flex-1 overflow-y-auto pb-14 sm:pb-0">
        {loading ? (
          <div className="flex items-center justify-center h-full f-body text-sm text-stone-400">Loading portfolio…</div>
        ) : error ? (
          <div className="flex items-center justify-center h-full f-body text-sm text-red-600 px-8 text-center">{error}</div>
        ) : (
          <Routes>
            <Route path="/" element={withTopBar(TITLES.dashboard, <DashboardView goProject={goProject} />)} />
            <Route path="/projects" element={withTopBar(TITLES.projects, <ProjectsView goProject={goProject} />)} />
            <Route path="/projects/:projectId" element={<ProjectDetailRoute />} />
            <Route path="/projects/:projectId/:tabSlug" element={<ProjectDetailRoute />} />
            <Route path="/schedule" element={withTopBar(TITLES.schedule, <ScheduleView goProject={goProject} />)} />
            <Route path="/budget" element={withTopBar(TITLES.budget, <BudgetView goProject={goProject} />)} />
            <Route path="/materials" element={withTopBar(TITLES.materials, <MaterialsView goProject={goProject} />)} />
            <Route path="/team" element={withTopBar(TITLES.team, <TeamView />)} />
            <Route path="/reports" element={withTopBar(TITLES.reports, <ReportsView goProject={goProject} />)} />
            <Route path="/admin" element={isAdmin ? withTopBar(TITLES.admin, <AdminView />) : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </div>
      <BottomNav />
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
    <BrowserRouter>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </BrowserRouter>
  );
}
