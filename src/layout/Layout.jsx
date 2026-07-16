import React from "react";
import {
  LayoutDashboard, Building2, Calendar, DollarSign, Users, BarChart3,
  ArrowLeft, HardHat, LogOut, ShieldCheck, Package
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { TODAY } from "../lib/format";

export const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "projects", label: "Projects", icon: Building2 },
  { key: "schedule", label: "Schedule", icon: Calendar },
  { key: "budget", label: "Budget", icon: DollarSign },
  { key: "materials", label: "Materials", icon: Package },
  { key: "team", label: "Team", icon: Users },
  { key: "reports", label: "Reports", icon: BarChart3 },
];

export function Sidebar({ view, setView, setSelectedProject }) {
  const { session, signOut, isAdmin } = useAuth();
  const items = isAdmin ? [...NAV_ITEMS, { key: "admin", label: "Admin", icon: ShieldCheck }] : NAV_ITEMS;
  return (
    <div className="hidden sm:flex w-56 shrink-0 bg-stone-900 text-stone-300 flex-col h-full">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-stone-800">
        <div className="w-8 h-8 rounded-sm bg-orange-600 flex items-center justify-center shrink-0">
          <HardHat size={18} className="text-white" />
        </div>
        <div className="f-display text-lg tracking-wide text-white leading-none">SITELINE</div>
      </div>
      <nav className="flex-1 py-4">
        {items.map((it) => {
          const active = view === it.key;
          return (
            <button
              key={it.key}
              onClick={() => { setView(it.key); setSelectedProject(null); }}
              className={`w-full flex items-center gap-3 px-5 py-2.5 f-body text-sm transition-colors ${
                active ? "bg-stone-800 text-white border-l-2 border-orange-600" : "border-l-2 border-transparent hover:bg-stone-800/60 hover:text-white"
              }`}
            >
              <it.icon size={16} />
              {it.label}
            </button>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-stone-800">
        <div className="f-mono text-[10px] text-stone-500 uppercase tracking-wide truncate mb-2">
          {session?.user?.email} {isAdmin && <span className="text-orange-500">· Admin</span>}
        </div>
        <button onClick={signOut} className="flex items-center gap-1.5 f-body text-xs text-stone-400 hover:text-white">
          <LogOut size={13} /> Sign Out
        </button>
      </div>
    </div>
  );
}

export function MobileTopBar({ onSelectHome }) {
  const { signOut } = useAuth();
  return (
    <div className="sm:hidden flex items-center justify-between gap-2 px-4 py-3 bg-stone-900 border-b border-stone-800 shrink-0">
      <button onClick={onSelectHome} className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-sm bg-orange-600 flex items-center justify-center shrink-0">
          <HardHat size={15} className="text-white" />
        </div>
        <div className="f-display text-base tracking-wide text-white leading-none">SITELINE</div>
      </button>
      <button onClick={signOut} className="text-stone-400 hover:text-white">
        <LogOut size={16} />
      </button>
    </div>
  );
}

export function BottomNav({ view, setView, setSelectedProject }) {
  const { isAdmin } = useAuth();
  const items = isAdmin ? [...NAV_ITEMS, { key: "admin", label: "Admin", icon: ShieldCheck }] : NAV_ITEMS;
  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-20 bg-stone-900 border-t border-stone-800 flex overflow-x-auto" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {items.map((it) => {
        const active = view === it.key;
        return (
          <button
            key={it.key}
            onClick={() => { setView(it.key); setSelectedProject(null); }}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 f-mono text-[10px] uppercase tracking-wide shrink-0 min-w-[60px] ${active ? "text-orange-500" : "text-stone-500"}`}
          >
            <it.icon size={18} />
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

export function TopBar({ title, breadcrumb, onBack, right }) {
  return (
    <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 border-b border-stone-200 bg-white gap-4">
      <div className="min-w-0">
        {breadcrumb && (
          <button onClick={onBack} className="flex items-center gap-1 f-mono text-xs text-stone-500 hover:text-orange-600 mb-1 uppercase tracking-wide">
            <ArrowLeft size={12} /> {breadcrumb}
          </button>
        )}
        <h1 className="f-display text-xl sm:text-2xl text-stone-900 tracking-wide truncate">{title}</h1>
      </div>
      {right ? (
        <div className="shrink-0">{right}</div>
      ) : (
        <div className="hidden md:block f-mono text-xs text-stone-400 uppercase tracking-wide shrink-0 ml-4">{TODAY.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
      )}
    </div>
  );
}
