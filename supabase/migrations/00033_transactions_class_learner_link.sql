-- Link transactions to the booked class + the kid the booking is for.
-- These FKs are nullable for backwards compatibility (older bookings
-- may not have them; non-class transaction types like wallet topups
-- legitimately don't have a class).

alter table transactions
  add column if not exists live_class_id uuid references live_classes (id) on delete set null,
  add column if not exists learner_id uuid references learner_profiles (id) on delete set null;

create index if not exists idx_transactions_live_class_id
  on transactions (live_class_id);
create index if not exists idx_transactions_learner_id
  on transactions (learner_id);

-- Backfill: for each transaction, find the most plausible enrollment.
-- Match parent_id + teacher of the class, then take the enrollment
-- whose creation is closest in time. Imperfect but serviceable; the
-- new code path will always populate these going forward.
with candidates as (
  select
    t.id as tx_id,
    e.live_class_id,
    e.learner_id,
    abs(extract(epoch from (t.created_at - e.enrolled_at))) as gap,
    row_number() over (
      partition by t.id
      order by abs(extract(epoch from (t.created_at - e.enrolled_at)))
    ) as rn
  from transactions t
  join enrollments e on e.learner_id in (
    select id from learner_profiles where parent_id = t.parent_id
  )
  join live_classes lc on lc.id = e.live_class_id
  where t.live_class_id is null
    and t.type = 'class_booking'
    and lc.teacher_id = t.teacher_id
)
update transactions t
set live_class_id = c.live_class_id,
    learner_id = c.learner_id
from candidates c
where c.tx_id = t.id
  and c.rn = 1
  and t.live_class_id is null;
