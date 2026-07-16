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
  id: row.id,
  phase: row.phase,
  start: row.start_date,
  end: row.end_date,
  status: row.status,
  trade: row.trade,
  sortOrder: row.sort_order,
});

const budgetItem = (row) => ({
  id: row.id,
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
  id: row.id,
  name: row.name,
  category: row.category,
  date: row.doc_date,
  status: row.status,
  filePath: row.file_path,
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
  id: row.id,
  project: row.project_id,
  text: row.text,
  level: row.level,
});

const profile = (row) => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  role: row.role,
});

const room = (row) => ({
  id: row.id,
  projectId: row.project_id,
  name: row.name,
  sortOrder: row.sort_order,
});

const material = (row) => ({
  id: row.id,
  projectId: row.project_id,
  roomId: row.room_id,
  item: row.item,
  manufacturer: row.manufacturer,
  color: row.color,
  details: row.details,
  status: row.status,
  cost: row.cost != null ? Number(row.cost) : null,
  phaseId: row.phase_id,
  budgetItemId: row.budget_item_id,
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
    { data: roomRows, error: roomErr },
    { data: materialRows, error: materialErr },
  ] = await Promise.all([
    supabase.from("projects").select("*").order("created_at"),
    supabase.from("schedule_phases").select("*").order("sort_order"),
    supabase.from("budget_items").select("*"),
    supabase.from("punchlist_items").select("*").order("created_at"),
    supabase.from("documents").select("*").order("doc_date"),
    supabase.from("team_members").select("*").order("name"),
    supabase.from("project_team").select("*"),
    supabase.from("alerts").select("*").order("created_at"),
    supabase.from("rooms").select("*").order("sort_order"),
    supabase.from("materials").select("*").order("item"),
  ]);

  const err = projectErr || phaseErr || budgetErr || punchErr || docErr || teamErr || linkErr || alertErr || roomErr || materialErr;
  if (err) throw err;

  const groupBy = (rows, mapFn, key = "project_id") =>
    rows.reduce((acc, row) => {
      (acc[row[key]] ||= []).push(mapFn(row));
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
    rooms: groupBy(roomRows, room),
    materials: groupBy(materialRows, material),
    materialsByRoom: groupBy(materialRows, material, "room_id"),
  };
}

/* ---------------------------------------------------------------
   PROJECTS
--------------------------------------------------------------- */
const projectPayload = (input) => ({
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
});

export async function createProject(input) {
  const { data, error } = await supabase.from("projects").insert(projectPayload(input)).select().single();
  if (error) throw error;
  return project(data);
}

export async function updateProject(id, input) {
  const { error } = await supabase.from("projects").update(projectPayload(input)).eq("id", id);
  if (error) throw error;
}

export async function deleteProject(id) {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------------------------------------------------------
   SCHEDULE PHASES
--------------------------------------------------------------- */
const phasePayload = (projectId, input) => ({
  project_id: projectId,
  phase: input.phase,
  start_date: input.start,
  end_date: input.end,
  status: input.status,
  trade: input.trade,
  sort_order: input.sortOrder ?? 0,
});

export async function createPhase(projectId, input) {
  const { error } = await supabase.from("schedule_phases").insert(phasePayload(projectId, input));
  if (error) throw error;
}

export async function updatePhase(id, projectId, input) {
  const { error } = await supabase.from("schedule_phases").update(phasePayload(projectId, input)).eq("id", id);
  if (error) throw error;
}

export async function deletePhase(id) {
  const { error } = await supabase.from("schedule_phases").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------------------------------------------------------
   BUDGET ITEMS
--------------------------------------------------------------- */
const budgetPayload = (projectId, input) => ({
  project_id: projectId,
  category: input.category,
  budgeted: input.budgeted ?? 0,
  actual: input.actual ?? 0,
});

export async function createBudgetItem(projectId, input) {
  const { error } = await supabase.from("budget_items").insert(budgetPayload(projectId, input));
  if (error) throw error;
}

export async function updateBudgetItem(id, projectId, input) {
  const { error } = await supabase.from("budget_items").update(budgetPayload(projectId, input)).eq("id", id);
  if (error) throw error;
}

export async function deleteBudgetItem(id) {
  const { error } = await supabase.from("budget_items").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------------------------------------------------------
   PUNCH LIST ITEMS
--------------------------------------------------------------- */
const punchPayload = (projectId, input) => ({
  project_id: projectId,
  item: input.item,
  location: input.location,
  trade: input.trade,
  status: input.status ?? "Open",
});

export async function createPunchItem(projectId, input) {
  const { error } = await supabase.from("punchlist_items").insert(punchPayload(projectId, input));
  if (error) throw error;
}

export async function updatePunchItem(id, projectId, input) {
  const { error } = await supabase.from("punchlist_items").update(punchPayload(projectId, input)).eq("id", id);
  if (error) throw error;
}

export async function updatePunchlistStatus(id, status) {
  const { error } = await supabase.from("punchlist_items").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deletePunchItem(id) {
  const { error } = await supabase.from("punchlist_items").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------------------------------------------------------
   DOCUMENTS (+ optional file upload via Storage)
--------------------------------------------------------------- */
export async function uploadDocumentFile(projectId, file) {
  const path = `${projectId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("documents").upload(path, file);
  if (error) throw error;
  return path;
}

export async function getDocumentDownloadUrl(filePath) {
  const { data, error } = await supabase.storage.from("documents").createSignedUrl(filePath, 60);
  if (error) throw error;
  return data.signedUrl;
}

const documentPayload = (projectId, input) => ({
  project_id: projectId,
  name: input.name,
  category: input.category,
  doc_date: input.date,
  status: input.status,
  file_path: input.filePath ?? null,
});

export async function createDocument(projectId, input) {
  const { error } = await supabase.from("documents").insert(documentPayload(projectId, input));
  if (error) throw error;
}

export async function updateDocument(id, projectId, input) {
  const { error } = await supabase.from("documents").update(documentPayload(projectId, input)).eq("id", id);
  if (error) throw error;
}

export async function deleteDocument(id, filePath) {
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw error;
  if (filePath) {
    await supabase.storage.from("documents").remove([filePath]);
  }
}

/* ---------------------------------------------------------------
   TEAM MEMBERS + PROJECT ASSIGNMENT
--------------------------------------------------------------- */
const teamPayload = (input) => ({
  name: input.name,
  role: input.role,
  type: input.type,
  trade: input.trade,
  phone: input.phone,
});

export async function createTeamMember(input) {
  const { data, error } = await supabase.from("team_members").insert(teamPayload(input)).select().single();
  if (error) throw error;
  return teamMember(data);
}

export async function updateTeamMember(id, input) {
  const { error } = await supabase.from("team_members").update(teamPayload(input)).eq("id", id);
  if (error) throw error;
}

export async function deleteTeamMember(id) {
  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) throw error;
}

export async function assignTeamMember(projectId, teamMemberId) {
  const { error } = await supabase.from("project_team").insert({ project_id: projectId, team_member_id: teamMemberId });
  if (error) throw error;
}

export async function unassignTeamMember(projectId, teamMemberId) {
  const { error } = await supabase
    .from("project_team")
    .delete()
    .eq("project_id", projectId)
    .eq("team_member_id", teamMemberId);
  if (error) throw error;
}

/* ---------------------------------------------------------------
   PROFILES / ROLES (admin only, enforced by RLS)
--------------------------------------------------------------- */
export async function getMyProfile() {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userData.user.id).single();
  if (error) throw error;
  return profile(data);
}

export async function listProfiles() {
  const { data, error } = await supabase.from("profiles").select("*").order("email");
  if (error) throw error;
  return data.map(profile);
}

export async function updateProfileRole(id, role) {
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) throw error;
}

/* ---------------------------------------------------------------
   ROOMS + MATERIALS
--------------------------------------------------------------- */
export async function createRoom(projectId, input) {
  const { data, error } = await supabase
    .from("rooms")
    .insert({ project_id: projectId, name: input.name, sort_order: input.sortOrder ?? 0 })
    .select()
    .single();
  if (error) throw error;
  return room(data);
}

export async function updateRoom(id, input) {
  const { error } = await supabase.from("rooms").update({ name: input.name }).eq("id", id);
  if (error) throw error;
}

export async function deleteRoom(id) {
  const { error } = await supabase.from("rooms").delete().eq("id", id);
  if (error) throw error;
}

const materialPayload = (projectId, roomId, input) => ({
  project_id: projectId,
  room_id: roomId,
  item: input.item,
  manufacturer: input.manufacturer,
  color: input.color,
  details: input.details,
  status: input.status ?? "Selected",
  cost: input.cost === "" || input.cost == null ? null : Number(input.cost),
  phase_id: input.phaseId || null,
  budget_item_id: input.budgetItemId || null,
});

export async function createMaterial(projectId, roomId, input) {
  const { error } = await supabase.from("materials").insert(materialPayload(projectId, roomId, input));
  if (error) throw error;
}

export async function updateMaterial(id, projectId, roomId, input) {
  const { error } = await supabase.from("materials").update(materialPayload(projectId, roomId, input)).eq("id", id);
  if (error) throw error;
}

export async function deleteMaterial(id) {
  const { error } = await supabase.from("materials").delete().eq("id", id);
  if (error) throw error;
}
