// Field schemas driving the generic EntityModal add/edit form for each entity.

export const PROJECT_FIELDS = [
  { key: "name", label: "Project Name", type: "text", required: true },
  { key: "type", label: "Type", type: "text", required: true, placeholder: "New Build, Remodel…" },
  { key: "client", label: "Client", type: "text", required: true },
  { key: "address", label: "Address", type: "text", required: true },
  { key: "status", label: "Status", type: "select", required: true, options: ["Pre-Construction", "On Schedule", "Behind Schedule", "Punch List"] },
  { key: "phase", label: "Current Phase", type: "text", required: true },
  { key: "percentComplete", label: "Percent Complete", type: "number" },
  { key: "start", label: "Start Date", type: "date", required: true },
  { key: "target", label: "Target Completion", type: "date", required: true },
  { key: "budgetTotal", label: "Total Budget", type: "number", required: true },
  { key: "budgetSpent", label: "Budget Spent", type: "number" },
  { key: "pm", label: "Project Manager", type: "text" },
  { key: "superintendent", label: "Superintendent", type: "text" },
];

export const PHASE_FIELDS = [
  { key: "phase", label: "Phase Name", type: "text", required: true },
  { key: "start", label: "Start Date", type: "date", required: true },
  { key: "end", label: "End Date", type: "date", required: true },
  { key: "status", label: "Status", type: "select", required: true, options: ["Upcoming", "In Progress", "Delayed", "Complete"] },
  { key: "trade", label: "Trade", type: "text" },
];

export const BUDGET_FIELDS = [
  { key: "category", label: "Category", type: "text", required: true },
  { key: "budgeted", label: "Budgeted", type: "number", required: true },
  { key: "actual", label: "Actual", type: "number" },
];

export const PUNCH_FIELDS = [
  { key: "item", label: "Item", type: "text", required: true },
  { key: "location", label: "Location", type: "text" },
  { key: "trade", label: "Trade", type: "text" },
  { key: "status", label: "Status", type: "select", required: true, options: ["Open", "In Progress", "Complete"] },
];

export const DOCUMENT_FIELDS = [
  { key: "name", label: "Document Name", type: "text", required: true },
  { key: "category", label: "Category", type: "text", placeholder: "Permit, Drawing, Contract…" },
  { key: "date", label: "Date", type: "date", required: true },
  { key: "status", label: "Status", type: "select", required: true, options: ["Draft", "Current", "Approved", "Signed"] },
  { key: "file", label: "File (optional)", type: "file" },
];

export const TEAM_FIELDS = [
  { key: "name", label: "Name", type: "text", required: true },
  { key: "role", label: "Role", type: "text", required: true, placeholder: "Project Manager, Subcontractor…" },
  { key: "type", label: "Type", type: "select", required: true, options: ["Staff", "Subcontractor"] },
  { key: "trade", label: "Trade", type: "text" },
  { key: "phone", label: "Phone", type: "text" },
];
