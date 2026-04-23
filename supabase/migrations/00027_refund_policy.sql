-- Refund policy engine
-- Parents can request refunds based on cancellation timing.
-- Admins approve/deny and the transaction status is updated.
--
-- Refund rules (enforced in application code, src/lib/refund-policy.ts):
--   > 24h before class start = 100% refund
--   2-24h before class start = 50% refund
--   < 2h before class start = 0% refund (denied)

create table if not exists refund_requests (
  id uuid primary key default uuid_generate_v4(),
  transaction_id uuid not null references transactions (id) on delete cascade,
  parent_id uuid not null references profiles (id) on delete cascade,
  live_class_id uuid references live_classes (id) on delete set null,
  reason text,
  requested_amount_xof int not null,
  approved_amount_xof int,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied', 'partial')),
  admin_notes text,
  processed_by uuid references profiles (id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_refund_requests_parent on refund_requests (parent_id);
create index if not exists idx_refund_requests_status on refund_requests (status);
create index if not exists idx_refund_requests_transaction on refund_requests (transaction_id);

-- RLS: parents see their own requests; admins see all.
alter table refund_requests enable row level security;

drop policy if exists "refund_requests_parent_read_own" on refund_requests;
create policy "refund_requests_parent_read_own"
  on refund_requests for select
  using (parent_id = auth.uid());

drop policy if exists "refund_requests_admin_all" on refund_requests;
create policy "refund_requests_admin_all"
  on refund_requests for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'school_admin')
    )
  );

-- Inserts/updates go through the service role (API routes), so no public INSERT/UPDATE policy is needed.
