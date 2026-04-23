-- Wishlist / saved classes
-- Parents can bookmark classes they're interested in.

create table if not exists saved_classes (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid not null references profiles (id) on delete cascade,
  live_class_id uuid not null references live_classes (id) on delete cascade,
  saved_at timestamptz not null default now(),
  constraint uq_saved_classes unique (parent_id, live_class_id)
);

create index if not exists idx_saved_classes_parent on saved_classes (parent_id);
create index if not exists idx_saved_classes_class on saved_classes (live_class_id);

-- RLS: parents manage their own bookmarks; admins can read all.
alter table saved_classes enable row level security;

drop policy if exists "saved_classes_parent_select_own" on saved_classes;
create policy "saved_classes_parent_select_own"
  on saved_classes for select
  using (parent_id = auth.uid());

drop policy if exists "saved_classes_parent_insert_own" on saved_classes;
create policy "saved_classes_parent_insert_own"
  on saved_classes for insert
  with check (parent_id = auth.uid());

drop policy if exists "saved_classes_parent_delete_own" on saved_classes;
create policy "saved_classes_parent_delete_own"
  on saved_classes for delete
  using (parent_id = auth.uid());

drop policy if exists "saved_classes_admin_read" on saved_classes;
create policy "saved_classes_admin_read"
  on saved_classes for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'school_admin')
    )
  );
