import { supabase } from "./supabase";

const project = (row) => ({
  id: row.id,
  name: row.name,
  type: row.type,
  address: row.address,
  client: row.client,
  status: row.status,
  phase: row.phase,
  percentComplete: row.percent_complete,
  start: row.start_date,
  target: row.target_date,
  budgetTotal: Number(row.budget_total),
  budgetSpent: Number(row.budget_spent),
  pm: row.pm,
  superintendent: row.superintendent,
});

const phase = (row) => ({
  phase: row.phase,
  start: row.start_date,
  end: row.end_date,
  status: row.status,
  trade: row.trade,
});

const budgetItem = (row) => ({
  category: row.category,
  budgeted: Number(row.budgeted),
  actual: Number(row.actual),
});

const punchItem = (row) => ({
  id: row.id,
  item: row.item,
  location: row.location,
  trade: row.trade,
  status: row.status,
});

const document = (row) => ({
  name: row.name,
  category: row.category,
  date: row.doc_date,
  status: row.status,
});

const teamMember = (row) => ({
  id: row.id,
  name: row.name,
  role: row.role,
  type: row.type,
  trade: row.trade,
  phone: row.phone,
});

const alert = (row) => ({
  project: row.project_id,
  text: row.text,
  level: row.level,
});

// Loads everything the app needs in one pass and shapes it into the same
// structure the original prototype used (PROJECTS array, SCHEDULES/BUDGETS/
// etc keyed by project id), so the view components didn't need to change.
export async function loadPortfolio() {
  const [
    { data: projectRows, error: projectErr },
    { data: phaseRows, error: phaseErr },
    { data: budgetRows, error: budgetErr },
    { data: punchRows, error: punchErr },
    { data: docRows, error: docErr },
    { data: teamRows, error: teamErr },
    { data: linkRows, error: linkErr },
    { data: alertRows, error: alertErr },
  ] = await Promise.all([
    supabase.from("projects").select("*").order("created_at"),
    supabase.from("schedule_phases").select("*").order("sort_order"),
    supabase.from("budget_items").select("*"),
    supabase.from("punchlist_items").select("*").order("created_at"),
    supabase.from("documents").select("*").order("doc_date"),
    supabase.from("team_members").select("*").order("name"),
    supabase.from("project_team").select("*"),
    supabase.from("alerts").select("*").order("created_at"),
  ]);

  const err = projectErr || phaseErr || budgetErr || punchErr || docErr || teamErr || linkErr || alertErr;
  if (err) throw err;

  const groupBy = (rows, mapFn) =>
    rows.reduce((acc, row) => {
      (acc[row.project_id] ||= []).push(mapFn(row));
      return acc;
    }, {});

  const teamById = Object.fromEntries(teamRows.map((t) => [t.id, teamMember(t)]));
  const teamByProject = linkRows.reduce((acc, link) => {
    (acc[link.project_id] ||= []).push(teamById[link.team_member_id]);
    return acc;
  }, {});

  return {
    projects: projectRows.map(project),
    schedules: groupBy(phaseRows, phase),
    budgets: groupBy(budgetRows, budgetItem),
    punchlists: groupBy(punchRows, punchItem),
    documents: groupBy(docRows, document),
    team: teamRows.map(teamMember),
    teamByProject,
    alerts: alertRows.map(alert),
  };
}

export async function createProject(input) {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: input.name,
      type: input.type,
      address: input.address,
      client: input.client,
      status: input.status,
      phase: input.phase,
      percent_complete: input.percentComplete ?? 0,
      start_date: input.start,
      target_date: input.target,
      budget_total: input.budgetTotal,
      budget_spent: input.budgetSpent ?? 0,
      pm: input.pm,
      superintendent: input.superintendent,
    })
    .select()
    .single();

  if (error) throw error;
  return project(data);
}

export async function updatePunchlistStatus(id, status) {
  const { error } = await supabase.from("punchlist_items").update({ status }).eq("id", id);
  if (error) throw error;
}
