// Maps project-detail tab labels to URL-safe slugs and back, so a tab
// switch is reflected in the URL (and therefore survives a refresh / works
// with the browser back button) without changing the tab labels used
// throughout ProjectDetail.jsx.
const TAB_TO_SLUG = {
  Overview: "overview",
  Schedule: "schedule",
  Budget: "budget",
  "Punch List": "punch-list",
  Documents: "documents",
  Materials: "materials",
  Team: "team",
};
const SLUG_TO_TAB = Object.fromEntries(Object.entries(TAB_TO_SLUG).map(([tab, slug]) => [slug, tab]));

export const tabToSlug = (tab) => TAB_TO_SLUG[tab] || TAB_TO_SLUG.Overview;
export const slugToTab = (slug) => SLUG_TO_TAB[slug] || null;

// Top-level nav key -> URL path, and the reverse for highlighting the
// active sidebar/bottom-nav item based on the current location.
export const VIEW_PATHS = {
  dashboard: "/",
  projects: "/projects",
  schedule: "/schedule",
  budget: "/budget",
  materials: "/materials",
  team: "/team",
  reports: "/reports",
  admin: "/admin",
};

export function projectPath(projectId, tab) {
  return tab ? `/projects/${projectId}/${tabToSlug(tab)}` : `/projects/${projectId}`;
}
