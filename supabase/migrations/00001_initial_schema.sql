-- EcoleVersity Initial Schema
-- 28 tables, enums, indexes, triggers
-- All money as integers (FCFA), all timestamps as timestamptz (UTC)

-- =============================================================================
-- Extensions
-- =============================================================================

create extension if not exists "uuid-ossp";

-- =============================================================================
-- Enums
-- =============================================================================

create type user_role as enum ('parent', 'teacher', 'admin', 'school_admin');

create type verification_status as enum (
  'pending', 'id_submitted', 'diploma_submitted', 'video_submitted',
  'fully_verified', 'rejected'
);

create type grade_level as enum (
  'CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2',
  '6eme', '5eme', '4eme', '3eme',
  '2nde', '1ere', 'Terminale'
);

create type target_exam as enum ('CEPE', 'BEPC', 'BAC', 'CONCOURS_6EME');

create type class_format as enum ('group', 'one_on_one');

create type class_status as enum ('scheduled', 'live', 'completed', 'cancelled');

create type course_status as enum ('draft', 'published', 'archived');

create type transaction_type as enum (
  'course_purchase', 'class_booking', 'refund', 'payout', 'referral_credit'
);

create type transaction_status as enum ('pending', 'confirmed', 'failed', 'refunded');

create type payment_provider as enum ('orange_money', 'wave', 'mtn_momo', 'wallet', 'manual');

create type payout_status as enum ('pending', 'processing', 'completed', 'failed');

create type ticket_category as enum ('payment', 'technical', 'dispute', 'account', 'other');

create type ticket_priority as enum ('low', 'medium', 'high');

create type ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');

create type strike_level as enum ('warning', 'strike_1', 'strike_2', 'strike_3');

create type report_category as enum ('inappropriate', 'safety', 'spam', 'off_platform', 'other');

create type report_status as enum ('pending', 'reviewed', 'action_taken', 'dismissed');

create type moderation_status as enum ('pending', 'approved', 'rejected');

create type school_type as enum ('private_school', 'tutoring_center', 'academy');

create type wallet_tx_type as enum ('refund_credit', 'purchase_debit', 'referral_credit', 'guarantee_credit');

create type ai_twin_maturity as enum ('level_0', 'level_1', 'level_2', 'level_3');

create type ai_processing_status as enum ('pending', 'transcribing', 'extracting', 'ready', 'failed');

create type recurrence_type as enum ('one_time', 'weekly', 'custom');

-- =============================================================================
-- Tables (in FK dependency order)
-- =============================================================================

-- 1. profiles
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role user_role not null,
  display_name text not null,
  avatar_url text,
  bio text,
  city text,
  country text not null default 'CI',
  phone text,
  phone_verified boolean not null default false,
  language_preference text not null default 'fr',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_role on profiles (role);
create index idx_profiles_city on profiles (city);

-- 2. schools
create table schools (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type school_type not null,
  city text,
  country text not null default 'CI',
  verification_status verification_status not null default 'pending',
  admin_user_id uuid not null references profiles (id),
  revenue_split decimal(3,2) not null default 0.50,
  created_at timestamptz not null default now()
);

create index idx_schools_admin_user_id on schools (admin_user_id);
create index idx_schools_verification_status on schools (verification_status);

-- 3. teacher_profiles
create table teacher_profiles (
  id uuid primary key references profiles (id) on delete cascade,
  subjects text[] not null default '{}',
  grade_levels grade_level[] not null default '{}',
  verification_status verification_status not null default 'pending',
  id_document_url text,
  diploma_url text,
  video_intro_url text,
  commission_rate decimal(3,2) not null default 0.20,
  rating_avg decimal(2,1) not null default 0.0,
  rating_count int not null default 0,
  school_id uuid references schools (id) on delete set null,
  payout_phone text,
  payout_provider payment_provider,
  is_away boolean not null default false,
  away_until timestamptz,
  away_message text,
  follower_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_teacher_profiles_verification_status on teacher_profiles (verification_status);
create index idx_teacher_profiles_school_id on teacher_profiles (school_id);
create index idx_teacher_profiles_subjects on teacher_profiles using gin (subjects);
create index idx_teacher_profiles_grade_levels on teacher_profiles using gin (grade_levels);

-- 4. learner_profiles
create table learner_profiles (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid not null references profiles (id) on delete cascade,
  first_name text not null,
  birth_year int,
  grade_level grade_level not null,
  target_exam target_exam,
  avatar_url text,
  created_at timestamptz not null default now()
);

create index idx_learner_profiles_parent_id on learner_profiles (parent_id);
create index idx_learner_profiles_grade_level on learner_profiles (grade_level);

-- 5. courses
create table courses (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid not null references profiles (id),
  title text not null,
  description text,
  subject text not null,
  grade_level grade_level not null,
  exam_type target_exam,
  language text not null default 'fr',
  price_xof int not null,
  status course_status not null default 'draft',
  thumbnail_url text,
  total_duration_minutes int not null default 0,
  enrollment_count int not null default 0,
  rating_avg decimal(2,1) not null default 0.0,
  rating_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_courses_teacher_id on courses (teacher_id);
create index idx_courses_status on courses (status);
create index idx_courses_subject on courses (subject);
create index idx_courses_grade_level on courses (grade_level);
create index idx_courses_exam_type on courses (exam_type);

-- 6. lessons
create table lessons (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references courses (id) on delete cascade,
  title text not null,
  video_url text,
  video_duration_seconds int not null default 0,
  pdf_attachment_url text,
  sort_order int not null default 0,
  is_preview boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_lessons_course_id on lessons (course_id);

-- 7. live_classes
create table live_classes (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid not null references profiles (id),
  title text not null,
  description text,
  subject text not null,
  grade_level grade_level not null,
  format class_format not null default 'group',
  max_students int not null default 15,
  price_xof int not null,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 60,
  recurrence recurrence_type not null default 'one_time',
  jitsi_room_id text,
  recording_url text,
  status class_status not null default 'scheduled',
  rating_avg decimal(2,1) not null default 0.0,
  rating_count int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_live_classes_teacher_id on live_classes (teacher_id);
create index idx_live_classes_status on live_classes (status);
create index idx_live_classes_subject on live_classes (subject);
create index idx_live_classes_grade_level on live_classes (grade_level);
create index idx_live_classes_scheduled_at on live_classes (scheduled_at);

-- 8. enrollments
create table enrollments (
  id uuid primary key default uuid_generate_v4(),
  learner_id uuid not null references learner_profiles (id) on delete cascade,
  course_id uuid references courses (id),
  live_class_id uuid references live_classes (id),
  enrolled_at timestamptz not null default now(),
  progress_pct int not null default 0,
  completed_at timestamptz,
  certificate_url text,
  constraint chk_enrollments_one_target check (
    (course_id is not null and live_class_id is null) or
    (course_id is null and live_class_id is not null)
  )
);

create index idx_enrollments_learner_id on enrollments (learner_id);
create index idx_enrollments_course_id on enrollments (course_id);
create index idx_enrollments_live_class_id on enrollments (live_class_id);

-- 9. transactions
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid not null references profiles (id),
  teacher_id uuid not null references profiles (id),
  type transaction_type not null,
  amount_xof int not null,
  currency text not null default 'XOF',
  commission_amount int not null default 0,
  teacher_amount int not null default 0,
  payment_provider payment_provider not null,
  payment_reference text,
  status transaction_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint uq_transactions_provider_reference unique (payment_provider, payment_reference)
);

create index idx_transactions_parent_id on transactions (parent_id);
create index idx_transactions_teacher_id on transactions (teacher_id);
create index idx_transactions_status on transactions (status);
create index idx_transactions_type on transactions (type);

-- 10. teacher_payouts
create table teacher_payouts (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid not null references profiles (id),
  amount_xof int not null,
  payout_phone text not null,
  provider payment_provider not null,
  status payout_status not null default 'pending',
  period_start timestamptz not null,
  period_end timestamptz not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_teacher_payouts_teacher_id on teacher_payouts (teacher_id);
create index idx_teacher_payouts_status on teacher_payouts (status);

-- 11. platform_wallet
create table platform_wallet (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles (id) on delete cascade unique,
  balance_xof int not null default 0,
  updated_at timestamptz not null default now()
);

create index idx_platform_wallet_user_id on platform_wallet (user_id);

-- 12. wallet_transactions
create table wallet_transactions (
  id uuid primary key default uuid_generate_v4(),
  wallet_id uuid not null references platform_wallet (id),
  type wallet_tx_type not null,
  amount_xof int not null,
  reference text,
  created_at timestamptz not null default now()
);

create index idx_wallet_transactions_wallet_id on wallet_transactions (wallet_id);

-- 13. conversations
create table conversations (
  id uuid primary key default uuid_generate_v4(),
  participant_1 uuid not null references profiles (id),
  participant_2 uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_conversations_participants unique (participant_1, participant_2),
  constraint chk_conversations_different_users check (participant_1 <> participant_2)
);

create index idx_conversations_participant_1 on conversations (participant_1);
create index idx_conversations_participant_2 on conversations (participant_2);

-- 14. messages
create table messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references profiles (id),
  content text not null,
  content_flagged boolean not null default false,
  attachments jsonb not null default '[]',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_messages_conversation_id on messages (conversation_id);
create index idx_messages_sender_id on messages (sender_id);
create index idx_messages_created_at on messages (created_at);

-- 15. reviews
create table reviews (
  id uuid primary key default uuid_generate_v4(),
  reviewer_id uuid not null references profiles (id),
  teacher_id uuid not null references profiles (id),
  course_id uuid references courses (id),
  live_class_id uuid references live_classes (id),
  rating int not null check (rating >= 1 and rating <= 5),
  comment text,
  moderation_status moderation_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index idx_reviews_reviewer_id on reviews (reviewer_id);
create index idx_reviews_teacher_id on reviews (teacher_id);
create index idx_reviews_course_id on reviews (course_id);
create index idx_reviews_live_class_id on reviews (live_class_id);
create index idx_reviews_moderation_status on reviews (moderation_status);

-- 16. referrals
create table referrals (
  id uuid primary key default uuid_generate_v4(),
  referrer_id uuid not null references profiles (id),
  referred_id uuid not null references profiles (id),
  type text not null check (type in ('parent', 'teacher')),
  credit_amount_xof int not null default 1000,
  status text not null default 'pending' check (status in ('pending', 'credited')),
  created_at timestamptz not null default now()
);

create index idx_referrals_referrer_id on referrals (referrer_id);
create index idx_referrals_referred_id on referrals (referred_id);

-- 17. teacher_followers
create table teacher_followers (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid not null references profiles (id),
  teacher_id uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  constraint uq_teacher_followers unique (parent_id, teacher_id)
);

create index idx_teacher_followers_parent_id on teacher_followers (parent_id);
create index idx_teacher_followers_teacher_id on teacher_followers (teacher_id);

-- 18. help_articles
create table help_articles (
  id uuid primary key default uuid_generate_v4(),
  title_fr text not null,
  title_en text,
  content_fr text not null,
  content_en text,
  category text not null check (category in ('getting_started', 'payments', 'classes', 'account', 'safety', 'teachers')),
  slug text not null unique,
  search_vector tsvector generated always as (
    to_tsvector('french', coalesce(title_fr, '') || ' ' || coalesce(content_fr, ''))
  ) stored,
  sort_order int not null default 0,
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

create index idx_help_articles_search_vector on help_articles using gin (search_vector);
create index idx_help_articles_category on help_articles (category);
create index idx_help_articles_slug on help_articles (slug);

-- 19. support_tickets
create table support_tickets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles (id),
  category ticket_category not null,
  priority ticket_priority not null default 'medium',
  subject text not null,
  conversation jsonb not null default '[]',
  status ticket_status not null default 'open',
  escalated_from_ama boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_support_tickets_user_id on support_tickets (user_id);
create index idx_support_tickets_status on support_tickets (status);
create index idx_support_tickets_category on support_tickets (category);
create index idx_support_tickets_priority on support_tickets (priority);

-- 20. teacher_strikes
create table teacher_strikes (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid not null references profiles (id),
  strike_level strike_level not null,
  reason text not null,
  evidence jsonb not null default '{}',
  issued_by uuid not null references profiles (id),
  expires_at timestamptz,
  status text not null default 'active' check (status in ('active', 'expired', 'appealed', 'revoked')),
  created_at timestamptz not null default now()
);

create index idx_teacher_strikes_teacher_id on teacher_strikes (teacher_id);
create index idx_teacher_strikes_status on teacher_strikes (status);

-- 21. content_reports
create table content_reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references profiles (id),
  reported_type text not null check (reported_type in ('message', 'review', 'teacher', 'course', 'class')),
  reported_id uuid not null,
  category report_category not null,
  description text,
  status report_status not null default 'pending',
  admin_notes text,
  created_at timestamptz not null default now()
);

create index idx_content_reports_reporter_id on content_reports (reporter_id);
create index idx_content_reports_status on content_reports (status);
create index idx_content_reports_reported_type on content_reports (reported_type);

-- 22. assignments
create table assignments (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid not null references profiles (id),
  course_id uuid references courses (id),
  live_class_id uuid references live_classes (id),
  title text not null,
  instructions text not null,
  due_at timestamptz,
  attachments jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index idx_assignments_teacher_id on assignments (teacher_id);
create index idx_assignments_course_id on assignments (course_id);
create index idx_assignments_live_class_id on assignments (live_class_id);

-- 23. assignment_submissions
create table assignment_submissions (
  id uuid primary key default uuid_generate_v4(),
  assignment_id uuid not null references assignments (id) on delete cascade,
  learner_id uuid not null references learner_profiles (id),
  content text not null,
  attachments jsonb not null default '[]',
  grade text,
  grade_score int check (grade_score >= 0 and grade_score <= 100),
  submitted_at timestamptz not null default now(),
  graded_at timestamptz
);

create index idx_assignment_submissions_assignment_id on assignment_submissions (assignment_id);
create index idx_assignment_submissions_learner_id on assignment_submissions (learner_id);

-- 24. teacher_coupons
create table teacher_coupons (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid not null references profiles (id),
  code text not null unique,
  discount_pct int not null check (discount_pct >= 5 and discount_pct <= 50),
  max_uses int not null default 100,
  uses_count int not null default 0,
  expires_at timestamptz not null,
  applies_to text not null default 'all',
  created_at timestamptz not null default now()
);

create index idx_teacher_coupons_teacher_id on teacher_coupons (teacher_id);
create index idx_teacher_coupons_code on teacher_coupons (code);

-- 25. waitlists
create table waitlists (
  id uuid primary key default uuid_generate_v4(),
  live_class_id uuid not null references live_classes (id),
  parent_id uuid not null references profiles (id),
  learner_id uuid not null references learner_profiles (id),
  position int not null,
  notified boolean not null default false,
  created_at timestamptz not null default now(),
  constraint uq_waitlists_class_learner unique (live_class_id, learner_id)
);

create index idx_waitlists_live_class_id on waitlists (live_class_id);
create index idx_waitlists_parent_id on waitlists (parent_id);
create index idx_waitlists_learner_id on waitlists (learner_id);

-- 26. ai_teacher_twins
create table ai_teacher_twins (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid not null references profiles (id),
  subject text not null,
  grade_level grade_level not null,
  maturity_level ai_twin_maturity not null default 'level_0',
  total_recordings_processed int not null default 0,
  teaching_style_profile jsonb not null default '{}',
  system_prompt text,
  is_active boolean not null default false,
  price_xof int not null default 300,
  total_sessions_served int not null default 0,
  rating_avg decimal(2,1) not null default 0.0,
  rating_count int not null default 0,
  created_at timestamptz not null default now(),
  last_trained_at timestamptz
);

create index idx_ai_teacher_twins_teacher_id on ai_teacher_twins (teacher_id);
create index idx_ai_teacher_twins_subject on ai_teacher_twins (subject);
create index idx_ai_teacher_twins_grade_level on ai_teacher_twins (grade_level);

-- 27. ai_training_content
create table ai_training_content (
  id uuid primary key default uuid_generate_v4(),
  twin_id uuid not null references ai_teacher_twins (id) on delete cascade,
  source_type text not null check (source_type in ('live_recording', 'course_video', 'uploaded_doc', 'exercise_set')),
  source_id uuid,
  transcription text,
  extracted_topics jsonb not null default '[]',
  embedding_ids text[] not null default '{}',
  processing_status ai_processing_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index idx_ai_training_content_twin_id on ai_training_content (twin_id);
create index idx_ai_training_content_processing_status on ai_training_content (processing_status);

-- 28. ai_twin_sessions
create table ai_twin_sessions (
  id uuid primary key default uuid_generate_v4(),
  twin_id uuid not null references ai_teacher_twins (id),
  learner_id uuid not null references learner_profiles (id),
  topic text not null,
  conversation jsonb not null default '[]',
  exercises_attempted int not null default 0,
  exercises_correct int not null default 0,
  mastery_score int not null default 0 check (mastery_score >= 0 and mastery_score <= 100),
  duration_seconds int not null default 0,
  tokens_used int not null default 0,
  escalated_to_human boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_ai_twin_sessions_twin_id on ai_twin_sessions (twin_id);
create index idx_ai_twin_sessions_learner_id on ai_twin_sessions (learner_id);

-- =============================================================================
-- Trigger Functions
-- =============================================================================

-- Auto-create profile row when a user signs up via auth.users
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, role, display_name, language_preference)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'parent'::public.user_role),
    coalesce(new.raw_user_meta_data ->> 'display_name', 'Utilisateur'),
    coalesce(new.raw_user_meta_data ->> 'language', 'fr')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Auto-update updated_at on row modification
create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create trigger trg_teacher_profiles_updated_at
  before update on teacher_profiles
  for each row execute function update_updated_at();

create trigger trg_courses_updated_at
  before update on courses
  for each row execute function update_updated_at();

create trigger trg_conversations_updated_at
  before update on conversations
  for each row execute function update_updated_at();
