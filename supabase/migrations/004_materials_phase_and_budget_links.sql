-- Applied 2026-07-16 via the Supabase MCP connector (apply_migration).
-- Materials can optionally be assigned to a schedule phase and/or a budget
-- line item, and carry an optional cost. Both links are ON DELETE SET NULL
-- so removing a phase/budget item never blocks or cascades into materials.

alter table materials add column phase_id uuid references schedule_phases(id) on delete set null;
alter table materials add column budget_item_id uuid references budget_items(id) on delete set null;
alter table materials add column cost numeric;

create index materials_phase_id_idx on materials(phase_id);
create index materials_budget_item_id_idx on materials(budget_item_id);
