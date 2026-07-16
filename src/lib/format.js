export const TODAY = new Date();

export const fmtMoney = (n) => "$" + Math.round(n).toLocaleString("en-US");
export const fmtMoneyShort = (n) => {
  if (n >= 1000) return "$" + (n / 1000).toFixed(0) + "k";
  return "$" + n;
};
export const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
export const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

export const STATUS_STYLES = {
  "On Schedule": "bg-green-50 text-green-700 border-green-200",
  "Behind Schedule": "bg-red-50 text-red-700 border-red-200",
  "Pre-Construction": "bg-stone-100 text-stone-600 border-stone-300",
  "Punch List": "bg-amber-50 text-amber-700 border-amber-200",
  "Complete": "bg-green-50 text-green-700 border-green-200",
  "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
  "Upcoming": "bg-stone-100 text-stone-500 border-stone-300",
  "Delayed": "bg-red-50 text-red-700 border-red-200",
  "Open": "bg-amber-50 text-amber-700 border-amber-200",
  "Approved": "bg-green-50 text-green-700 border-green-200",
  "Current": "bg-blue-50 text-blue-700 border-blue-200",
  "Signed": "bg-green-50 text-green-700 border-green-200",
  "Draft": "bg-stone-100 text-stone-600 border-stone-300",
};
export const statusStyle = (s) => STATUS_STYLES[s] || "bg-stone-100 text-stone-600 border-stone-300";

export const PHASE_BAR_COLOR = {
  "Complete": "bg-green-600",
  "In Progress": "bg-orange-600",
  "Delayed": "bg-red-600",
  "Upcoming": "bg-stone-300",
};

export const PUNCH_STATUS_CYCLE = { "Open": "In Progress", "In Progress": "Complete", "Complete": "Open" };
