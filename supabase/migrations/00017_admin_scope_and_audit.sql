-- =============================================================================
-- Migration 00017 — Admin scope granularity + audit logs + agent tables
-- =============================================================================
-- Purpose:
--  1. Let the founder delegate parts of the admin surface to sub-admins
--     without giving them the full keys (finance person can't see moderation;
--     moderator can't touch payouts; analytics viewer is read-only).
--  2. Create an append-only audit trail for every admin action so the
--     business can be handed off, sold, or investigated later.
--  3. Add the agent_audit_log + agent_config tables so the Phase 7 AI
--     agents framework (Le Patron + 5 lieutenants) can land without a
--     schema migration later.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. profiles.admin_scope — fine-grained admin permissions
-- -----------------------------------------------------------------------------
-- Only meaningful when profiles.role = 'admin'. NULL otherwise.
alter table profiles
  add column admin_scope text
  check (
    admin_scope is null
    or admin_scope in (
      'founder',
      'finance',
      'moderation',
      'verification',
      'support',
      'analytics_viewer'
    )
  );

comment on column profiles.admin_scope is
  'Per-admin permission scope. Founder sees everything; other scopes are narrowed to specific modules. Enforced in middleware + layout + API endpoints.';

-- Backfill: the founder (known by email aycoul@gmail.com) gets founder scope
update profiles
   set admin_scope = 'founder'
  where id in (
    select id from auth.users where email = 'aycoul@gmail.com'
  )
    and role = 'admin';

-- -----------------------------------------------------------------------------
-- 2. admin_audit_log — every admin action leaves a trail
-- -----------------------------------------------------------------------------
create table admin_audit_log (
  id            uuid primary key default uuid_generate_v4(),
  actor_id      uuid not null references profiles (id),
  actor_scope   text,
  action        text not null,
  target_table  text,
  target_id     uuid,
  before_json   jsonb,
  after_json    jsonb,
  notes         text,
  created_at    timestamptz not null default now()
);

create index idx_admin_audit_log_actor on admin_audit_log (actor_id);
create index idx_admin_audit_log_target on admin_audit_log (target_table, target_id);
create index idx_admin_audit_log_created_at on admin_audit_log (created_at desc);

comment on table admin_audit_log is
  'Append-only audit of every admin-driven state change. Founder-readable only.';

alter table admin_audit_log enable row level security;

create policy "admin_audit_log_select_founder"
  on admin_audit_log for select
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
        and profiles.admin_scope = 'founder'
    )
  );

-- Writes happen server-side via createAdminClient; no insert policy needed
-- because service_role bypasses RLS. We deliberately do NOT grant INSERT
-- to authenticated users — audit entries must come from backend code.

-- -----------------------------------------------------------------------------
-- 3. agent_audit_log + agent_config — Phase 7 shell
-- -----------------------------------------------------------------------------
-- agent_audit_log: each AI agent decision (auto-act or escalate)
create table agent_audit_log (
  id                      uuid primary key default uuid_generate_v4(),
  agent_name              text not null,
  action_type             text not null,
  target_table            text,
  target_id               uuid,
  confidence_score        numeric(5,4),
  decision                text not null check (decision in ('auto_approved','auto_rejected','escalated','observed')),
  details_json            jsonb,
  escalated               boolean not null default false,
  escalation_resolved_by  uuid references profiles (id),
  escalation_resolved_at  timestamptz,
  escalation_decision     text check (escalation_decision in ('approved','rejected','deferred')),
  created_at              timestamptz not null default now()
);

create index idx_agent_audit_log_agent on agent_audit_log (agent_name, created_at desc);
create index idx_agent_audit_log_escalated on agent_audit_log (escalated)
  where escalated = true and escalation_resolved_at is null;
create index idx_agent_audit_log_target on agent_audit_log (target_table, target_id);

comment on table agent_audit_log is
  'Every AI agent decision (auto or escalated). Drives /admin/agents dashboard.';

alter table agent_audit_log enable row level security;

create policy "agent_audit_log_select_admin"
  on agent_audit_log for select
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- agent_config: per-agent settings (confidence thresholds, on/off, whatsapp targets)
create table agent_config (
  id                          uuid primary key default uuid_generate_v4(),
  agent_name                  text not null unique,
  is_active                   boolean not null default true,
  confidence_threshold        numeric(5,4) not null default 0.8,
  escalation_whatsapp_number  text,
  settings_json               jsonb not null default '{}',
  updated_at                  timestamptz not null default now(),
  created_at                  timestamptz not null default now()
);

comment on table agent_config is
  'Per-agent runtime config. Founder can flip is_active or tune thresholds from /admin/agents.';

alter table agent_config enable row level security;

create policy "agent_config_select_admin"
  on agent_config for select
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "agent_config_update_founder"
  on agent_config for update
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
        and profiles.admin_scope = 'founder'
    )
  );

-- Seed the 6 agents with safe defaults so the dashboard has something to render
insert into agent_config (agent_name, is_active, confidence_threshold, settings_json) values
  ('ceo',           false, 0.90, '{"label":"Le Patron","description":"Monitors the business and the other 5 agents.","emoji":"👔"}'),
  ('verification',  false, 0.85, '{"label":"Vérification","description":"Checks teacher CNI, diploma, video.","emoji":"✅"}'),
  ('payment',       false, 0.95, '{"label":"Paiement","description":"Matches SMS/Flutterwave to pending bookings.","emoji":"💰"}'),
  ('moderation',    false, 0.90, '{"label":"Modération","description":"Scans messages, reviews, live video for PII / inappropriate content.","emoji":"🛡️"}'),
  ('support',       false, 0.80, '{"label":"Ama","description":"Resolves support tickets; can issue ≤2000 FCFA wallet credits.","emoji":"💬"}'),
  ('analytics',     false, 0.00, '{"label":"Analytics","description":"Computes daily metrics, sends 8am WAT digest.","emoji":"📊"}')
on conflict (agent_name) do nothing;
