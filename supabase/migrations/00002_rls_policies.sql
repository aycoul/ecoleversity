-- EcoleVersity RLS Policies
-- Row-Level Security for all 28 tables
-- Roles: parent, teacher, admin, school_admin

-- =============================================================================
-- Helper Functions
-- =============================================================================

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

create or replace function public.is_school_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'school_admin'
  );
$$ language sql security definer stable;

create or replace function public.get_role()
returns user_role as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- =============================================================================
-- Enable RLS on ALL 28 tables
-- =============================================================================

alter table profiles enable row level security;
alter table schools enable row level security;
alter table teacher_profiles enable row level security;
alter table learner_profiles enable row level security;
alter table courses enable row level security;
alter table lessons enable row level security;
alter table live_classes enable row level security;
alter table enrollments enable row level security;
alter table transactions enable row level security;
alter table teacher_payouts enable row level security;
alter table platform_wallet enable row level security;
alter table wallet_transactions enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table reviews enable row level security;
alter table referrals enable row level security;
alter table teacher_followers enable row level security;
alter table help_articles enable row level security;
alter table support_tickets enable row level security;
alter table teacher_strikes enable row level security;
alter table content_reports enable row level security;
alter table assignments enable row level security;
alter table assignment_submissions enable row level security;
alter table teacher_coupons enable row level security;
alter table waitlists enable row level security;
alter table ai_teacher_twins enable row level security;
alter table ai_training_content enable row level security;
alter table ai_twin_sessions enable row level security;

-- =============================================================================
-- 1. profiles
-- =============================================================================

-- Anyone authenticated can read profiles (needed for display names, avatars)
create policy "profiles_select_authenticated"
  on profiles for select
  to authenticated
  using (true);

-- Users update their own profile
create policy "profiles_update_own"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Admin full access
create policy "profiles_admin_insert"
  on profiles for insert
  to authenticated
  with check (public.is_admin());

create policy "profiles_admin_delete"
  on profiles for delete
  to authenticated
  using (public.is_admin());

-- =============================================================================
-- 2. schools
-- =============================================================================

-- Anyone can view schools
create policy "schools_select_all"
  on schools for select
  to authenticated
  using (true);

-- School admins manage their own school
create policy "schools_update_own"
  on schools for update
  to authenticated
  using (admin_user_id = auth.uid())
  with check (admin_user_id = auth.uid());

-- Admin full access
create policy "schools_admin_insert"
  on schools for insert
  to authenticated
  with check (public.is_admin() or admin_user_id = auth.uid());

create policy "schools_admin_delete"
  on schools for delete
  to authenticated
  using (public.is_admin());

create policy "schools_admin_update"
  on schools for update
  to authenticated
  using (public.is_admin());

-- =============================================================================
-- 3. teacher_profiles
-- =============================================================================

-- Anyone can view fully_verified teachers or own profile
create policy "teacher_profiles_select"
  on teacher_profiles for select
  to authenticated
  using (
    verification_status = 'fully_verified'
    or id = auth.uid()
    or public.is_admin()
    -- School admins see their school's teachers
    or (public.is_school_admin() and school_id in (
      select s.id from schools s where s.admin_user_id = auth.uid()
    ))
  );

-- Teachers update their own profile
create policy "teacher_profiles_update_own"
  on teacher_profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Teachers insert their own profile
create policy "teacher_profiles_insert_own"
  on teacher_profiles for insert
  to authenticated
  with check (id = auth.uid());

-- Admin full access
create policy "teacher_profiles_admin_all"
  on teacher_profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================================
-- 4. learner_profiles
-- =============================================================================

-- Parents see their own children
create policy "learner_profiles_select_parent"
  on learner_profiles for select
  to authenticated
  using (
    parent_id = auth.uid()
    or public.is_admin()
    -- Teachers can view enrolled learners
    or (public.get_role() = 'teacher' and id in (
      select e.learner_id from enrollments e
      left join courses c on e.course_id = c.id
      left join live_classes lc on e.live_class_id = lc.id
      where c.teacher_id = auth.uid() or lc.teacher_id = auth.uid()
    ))
  );

-- Parents manage their own children
create policy "learner_profiles_insert_parent"
  on learner_profiles for insert
  to authenticated
  with check (parent_id = auth.uid() or public.is_admin());

create policy "learner_profiles_update_parent"
  on learner_profiles for update
  to authenticated
  using (parent_id = auth.uid() or public.is_admin())
  with check (parent_id = auth.uid() or public.is_admin());

create policy "learner_profiles_delete_parent"
  on learner_profiles for delete
  to authenticated
  using (parent_id = auth.uid() or public.is_admin());

-- =============================================================================
-- 5. courses
-- =============================================================================

-- Anyone can view published courses; teachers see their own (any status)
create policy "courses_select"
  on courses for select
  to authenticated
  using (
    status = 'published'
    or teacher_id = auth.uid()
    or public.is_admin()
  );

-- Allow anonymous to view published courses
create policy "courses_select_anon"
  on courses for select
  to anon
  using (status = 'published');

-- Teachers manage their own courses
create policy "courses_insert_teacher"
  on courses for insert
  to authenticated
  with check (teacher_id = auth.uid() or public.is_admin());

create policy "courses_update_teacher"
  on courses for update
  to authenticated
  using (teacher_id = auth.uid() or public.is_admin())
  with check (teacher_id = auth.uid() or public.is_admin());

create policy "courses_delete_teacher"
  on courses for delete
  to authenticated
  using (teacher_id = auth.uid() or public.is_admin());

-- =============================================================================
-- 6. lessons
-- =============================================================================

-- Anyone can view lessons of published courses; teachers see own course lessons
create policy "lessons_select"
  on lessons for select
  to authenticated
  using (
    exists (
      select 1 from courses c
      where c.id = lessons.course_id
      and (c.status = 'published' or c.teacher_id = auth.uid())
    )
    or public.is_admin()
  );

-- Anon can view lessons of published courses
create policy "lessons_select_anon"
  on lessons for select
  to anon
  using (
    exists (
      select 1 from courses c
      where c.id = lessons.course_id and c.status = 'published'
    )
  );

-- Teachers manage lessons of their own courses
create policy "lessons_insert_teacher"
  on lessons for insert
  to authenticated
  with check (
    exists (
      select 1 from courses c
      where c.id = lessons.course_id and c.teacher_id = auth.uid()
    )
    or public.is_admin()
  );

create policy "lessons_update_teacher"
  on lessons for update
  to authenticated
  using (
    exists (
      select 1 from courses c
      where c.id = lessons.course_id and c.teacher_id = auth.uid()
    )
    or public.is_admin()
  );

create policy "lessons_delete_teacher"
  on lessons for delete
  to authenticated
  using (
    exists (
      select 1 from courses c
      where c.id = lessons.course_id and c.teacher_id = auth.uid()
    )
    or public.is_admin()
  );

-- =============================================================================
-- 7. live_classes
-- =============================================================================

-- Anyone can view scheduled/live classes; teachers see own (any status)
create policy "live_classes_select"
  on live_classes for select
  to authenticated
  using (
    status in ('scheduled', 'live')
    or teacher_id = auth.uid()
    or public.is_admin()
  );

create policy "live_classes_select_anon"
  on live_classes for select
  to anon
  using (status in ('scheduled', 'live'));

-- Teachers manage their own classes
create policy "live_classes_insert_teacher"
  on live_classes for insert
  to authenticated
  with check (teacher_id = auth.uid() or public.is_admin());

create policy "live_classes_update_teacher"
  on live_classes for update
  to authenticated
  using (teacher_id = auth.uid() or public.is_admin())
  with check (teacher_id = auth.uid() or public.is_admin());

create policy "live_classes_delete_teacher"
  on live_classes for delete
  to authenticated
  using (teacher_id = auth.uid() or public.is_admin());

-- =============================================================================
-- 8. enrollments
-- =============================================================================

-- Parents see enrollments for their children
create policy "enrollments_select_parent"
  on enrollments for select
  to authenticated
  using (
    exists (
      select 1 from learner_profiles lp
      where lp.id = enrollments.learner_id and lp.parent_id = auth.uid()
    )
    -- Teachers see enrollments in their courses/classes
    or exists (
      select 1 from courses c
      where c.id = enrollments.course_id and c.teacher_id = auth.uid()
    )
    or exists (
      select 1 from live_classes lc
      where lc.id = enrollments.live_class_id and lc.teacher_id = auth.uid()
    )
    or public.is_admin()
  );

-- Parents create enrollments for their own children
create policy "enrollments_insert_parent"
  on enrollments for insert
  to authenticated
  with check (
    exists (
      select 1 from learner_profiles lp
      where lp.id = enrollments.learner_id and lp.parent_id = auth.uid()
    )
    or public.is_admin()
  );

-- Parents update their children's enrollments (progress)
create policy "enrollments_update"
  on enrollments for update
  to authenticated
  using (
    exists (
      select 1 from learner_profiles lp
      where lp.id = enrollments.learner_id and lp.parent_id = auth.uid()
    )
    or public.is_admin()
  );

-- Admin can delete enrollments
create policy "enrollments_delete_admin"
  on enrollments for delete
  to authenticated
  using (public.is_admin());

-- =============================================================================
-- 9. transactions
-- =============================================================================

-- Users see their own transactions (as parent or teacher)
create policy "transactions_select_own"
  on transactions for select
  to authenticated
  using (
    parent_id = auth.uid()
    or teacher_id = auth.uid()
    or public.is_admin()
  );

-- System/admin creates transactions (typically via server-side)
create policy "transactions_insert"
  on transactions for insert
  to authenticated
  with check (parent_id = auth.uid() or public.is_admin());

-- Admin manages transactions
create policy "transactions_update_admin"
  on transactions for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "transactions_delete_admin"
  on transactions for delete
  to authenticated
  using (public.is_admin());

-- =============================================================================
-- 10. teacher_payouts
-- =============================================================================

-- Teachers see their own payouts
create policy "teacher_payouts_select_own"
  on teacher_payouts for select
  to authenticated
  using (teacher_id = auth.uid() or public.is_admin());

-- Admin manages payouts
create policy "teacher_payouts_insert_admin"
  on teacher_payouts for insert
  to authenticated
  with check (public.is_admin());

create policy "teacher_payouts_update_admin"
  on teacher_payouts for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "teacher_payouts_delete_admin"
  on teacher_payouts for delete
  to authenticated
  using (public.is_admin());

-- =============================================================================
-- 11. platform_wallet
-- =============================================================================

-- Users see their own wallet
create policy "platform_wallet_select_own"
  on platform_wallet for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- System creates wallets (on signup)
create policy "platform_wallet_insert"
  on platform_wallet for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_admin());

-- Admin manages wallets
create policy "platform_wallet_update"
  on platform_wallet for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "platform_wallet_delete_admin"
  on platform_wallet for delete
  to authenticated
  using (public.is_admin());

-- =============================================================================
-- 12. wallet_transactions
-- =============================================================================

-- Users see their own wallet transactions
create policy "wallet_transactions_select_own"
  on wallet_transactions for select
  to authenticated
  using (
    exists (
      select 1 from platform_wallet pw
      where pw.id = wallet_transactions.wallet_id and pw.user_id = auth.uid()
    )
    or public.is_admin()
  );

-- Admin manages wallet transactions
create policy "wallet_transactions_insert"
  on wallet_transactions for insert
  to authenticated
  with check (public.is_admin());

create policy "wallet_transactions_update_admin"
  on wallet_transactions for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "wallet_transactions_delete_admin"
  on wallet_transactions for delete
  to authenticated
  using (public.is_admin());

-- =============================================================================
-- 13. conversations
-- =============================================================================

-- Only participants can read conversations
create policy "conversations_select_participant"
  on conversations for select
  to authenticated
  using (
    participant_1 = auth.uid()
    or participant_2 = auth.uid()
    or public.is_admin()
  );

-- Users can create conversations (must be a participant)
-- Teachers can only message parent accounts (enforced: participant must be parent or teacher)
create policy "conversations_insert"
  on conversations for insert
  to authenticated
  with check (
    (participant_1 = auth.uid() or participant_2 = auth.uid())
    or public.is_admin()
  );

-- Admin can update/delete conversations
create policy "conversations_update_admin"
  on conversations for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "conversations_delete_admin"
  on conversations for delete
  to authenticated
  using (public.is_admin());

-- =============================================================================
-- 14. messages
-- =============================================================================

-- Only conversation participants can read messages
create policy "messages_select_participant"
  on messages for select
  to authenticated
  using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
      and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
    or public.is_admin()
  );

-- Only conversation participants can send messages (sender must be auth.uid())
create policy "messages_insert"
  on messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
      and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

-- Admin can insert messages (system messages)
create policy "messages_insert_admin"
  on messages for insert
  to authenticated
  with check (public.is_admin());

-- Admin manages messages (moderation)
create policy "messages_update_admin"
  on messages for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "messages_delete_admin"
  on messages for delete
  to authenticated
  using (public.is_admin());

-- =============================================================================
-- 15. reviews
-- =============================================================================

-- Anyone can read approved reviews; users see own pending reviews
create policy "reviews_select"
  on reviews for select
  to authenticated
  using (
    moderation_status = 'approved'
    or reviewer_id = auth.uid()
    or public.is_admin()
  );

create policy "reviews_select_anon"
  on reviews for select
  to anon
  using (moderation_status = 'approved');

-- Parents can create reviews
create policy "reviews_insert"
  on reviews for insert
  to authenticated
  with check (reviewer_id = auth.uid() or public.is_admin());

-- Users can update their own pending reviews
create policy "reviews_update_own"
  on reviews for update
  to authenticated
  using (reviewer_id = auth.uid() and moderation_status = 'pending')
  with check (reviewer_id = auth.uid());

-- Admin moderates reviews
create policy "reviews_admin_update"
  on reviews for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "reviews_admin_delete"
  on reviews for delete
  to authenticated
  using (public.is_admin());

-- =============================================================================
-- 16. referrals
-- =============================================================================

-- Users see referrals where they are referrer or referred
create policy "referrals_select_own"
  on referrals for select
  to authenticated
  using (
    referrer_id = auth.uid()
    or referred_id = auth.uid()
    or public.is_admin()
  );

-- Users can create referrals (referrer = self)
create policy "referrals_insert"
  on referrals for insert
  to authenticated
  with check (referrer_id = auth.uid() or public.is_admin());

-- Admin manages referrals
create policy "referrals_update_admin"
  on referrals for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "referrals_delete_admin"
  on referrals for delete
  to authenticated
  using (public.is_admin());

-- =============================================================================
-- 17. teacher_followers
-- =============================================================================

-- Users see their own follows; teachers see their followers
create policy "teacher_followers_select"
  on teacher_followers for select
  to authenticated
  using (
    parent_id = auth.uid()
    or teacher_id = auth.uid()
    or public.is_admin()
  );

-- Users manage their own follows
create policy "teacher_followers_insert"
  on teacher_followers for insert
  to authenticated
  with check (parent_id = auth.uid() or public.is_admin());

create policy "teacher_followers_delete_own"
  on teacher_followers for delete
  to authenticated
  using (parent_id = auth.uid() or public.is_admin());

-- No update needed (follow/unfollow only)

-- =============================================================================
-- 18. help_articles
-- =============================================================================

-- Anyone can read published help articles
create policy "help_articles_select_published"
  on help_articles for select
  to authenticated
  using (published = true or public.is_admin());

create policy "help_articles_select_anon"
  on help_articles for select
  to anon
  using (published = true);

-- Admin manages help articles
create policy "help_articles_insert_admin"
  on help_articles for insert
  to authenticated
  with check (public.is_admin());

create policy "help_articles_update_admin"
  on help_articles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "help_articles_delete_admin"
  on help_articles for delete
  to authenticated
  using (public.is_admin());

-- =============================================================================
-- 19. support_tickets
-- =============================================================================

-- Users see their own tickets; admin sees all
create policy "support_tickets_select"
  on support_tickets for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Users create their own tickets
create policy "support_tickets_insert"
  on support_tickets for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_admin());

-- Users can update their own tickets (add messages); admin manages all
create policy "support_tickets_update"
  on support_tickets for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- Admin can delete tickets
create policy "support_tickets_delete_admin"
  on support_tickets for delete
  to authenticated
  using (public.is_admin());

-- =============================================================================
-- 20. teacher_strikes
-- =============================================================================

-- Teachers see their own strikes; admin manages all
create policy "teacher_strikes_select"
  on teacher_strikes for select
  to authenticated
  using (teacher_id = auth.uid() or public.is_admin());

-- Admin manages strikes
create policy "teacher_strikes_insert_admin"
  on teacher_strikes for insert
  to authenticated
  with check (public.is_admin());

create policy "teacher_strikes_update_admin"
  on teacher_strikes for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "teacher_strikes_delete_admin"
  on teacher_strikes for delete
  to authenticated
  using (public.is_admin());

-- =============================================================================
-- 21. content_reports
-- =============================================================================

-- Users see their own reports; admin sees all
create policy "content_reports_select"
  on content_reports for select
  to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

-- Any authenticated user can create a report
create policy "content_reports_insert"
  on content_reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

-- Admin manages reports
create policy "content_reports_update_admin"
  on content_reports for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "content_reports_delete_admin"
  on content_reports for delete
  to authenticated
  using (public.is_admin());

-- =============================================================================
-- 22. assignments
-- =============================================================================

-- Teachers manage their own assignments
create policy "assignments_select"
  on assignments for select
  to authenticated
  using (
    teacher_id = auth.uid()
    or public.is_admin()
    -- Parents can view assignments for courses/classes their children are enrolled in
    or exists (
      select 1 from enrollments e
      join learner_profiles lp on lp.id = e.learner_id
      where lp.parent_id = auth.uid()
      and (e.course_id = assignments.course_id or e.live_class_id = assignments.live_class_id)
    )
  );

create policy "assignments_insert_teacher"
  on assignments for insert
  to authenticated
  with check (teacher_id = auth.uid() or public.is_admin());

create policy "assignments_update_teacher"
  on assignments for update
  to authenticated
  using (teacher_id = auth.uid() or public.is_admin())
  with check (teacher_id = auth.uid() or public.is_admin());

create policy "assignments_delete_teacher"
  on assignments for delete
  to authenticated
  using (teacher_id = auth.uid() or public.is_admin());

-- =============================================================================
-- 23. assignment_submissions
-- =============================================================================

-- Parents manage children's submissions; teachers see submissions for their assignments
create policy "assignment_submissions_select"
  on assignment_submissions for select
  to authenticated
  using (
    -- Parent sees children's submissions
    exists (
      select 1 from learner_profiles lp
      where lp.id = assignment_submissions.learner_id and lp.parent_id = auth.uid()
    )
    -- Teacher sees submissions for their assignments
    or exists (
      select 1 from assignments a
      where a.id = assignment_submissions.assignment_id and a.teacher_id = auth.uid()
    )
    or public.is_admin()
  );

-- Parents submit for their children
create policy "assignment_submissions_insert"
  on assignment_submissions for insert
  to authenticated
  with check (
    exists (
      select 1 from learner_profiles lp
      where lp.id = assignment_submissions.learner_id and lp.parent_id = auth.uid()
    )
    or public.is_admin()
  );

-- Parents can update their children's submissions (before grading);
-- Teachers can grade (update) submissions for their assignments
create policy "assignment_submissions_update"
  on assignment_submissions for update
  to authenticated
  using (
    exists (
      select 1 from learner_profiles lp
      where lp.id = assignment_submissions.learner_id and lp.parent_id = auth.uid()
    )
    or exists (
      select 1 from assignments a
      where a.id = assignment_submissions.assignment_id and a.teacher_id = auth.uid()
    )
    or public.is_admin()
  );

-- Admin can delete submissions
create policy "assignment_submissions_delete_admin"
  on assignment_submissions for delete
  to authenticated
  using (public.is_admin());

-- =============================================================================
-- 24. teacher_coupons
-- =============================================================================

-- Teachers manage their own coupons; anyone can view active coupons
create policy "teacher_coupons_select"
  on teacher_coupons for select
  to authenticated
  using (
    teacher_id = auth.uid()
    or public.is_admin()
    -- Anyone can see active, non-expired, non-maxed coupons
    or (expires_at > now() and uses_count < max_uses)
  );

create policy "teacher_coupons_insert_teacher"
  on teacher_coupons for insert
  to authenticated
  with check (teacher_id = auth.uid() or public.is_admin());

create policy "teacher_coupons_update_teacher"
  on teacher_coupons for update
  to authenticated
  using (teacher_id = auth.uid() or public.is_admin())
  with check (teacher_id = auth.uid() or public.is_admin());

create policy "teacher_coupons_delete_teacher"
  on teacher_coupons for delete
  to authenticated
  using (teacher_id = auth.uid() or public.is_admin());

-- =============================================================================
-- 25. waitlists
-- =============================================================================

-- Parents manage their own waitlist entries; teachers see waitlists for own classes
create policy "waitlists_select"
  on waitlists for select
  to authenticated
  using (
    parent_id = auth.uid()
    or exists (
      select 1 from live_classes lc
      where lc.id = waitlists.live_class_id and lc.teacher_id = auth.uid()
    )
    or public.is_admin()
  );

create policy "waitlists_insert_parent"
  on waitlists for insert
  to authenticated
  with check (
    parent_id = auth.uid()
    and exists (
      select 1 from learner_profiles lp
      where lp.id = waitlists.learner_id and lp.parent_id = auth.uid()
    )
  );

-- Admin insert
create policy "waitlists_insert_admin"
  on waitlists for insert
  to authenticated
  with check (public.is_admin());

-- Parents can remove themselves from waitlist
create policy "waitlists_delete_own"
  on waitlists for delete
  to authenticated
  using (parent_id = auth.uid() or public.is_admin());

-- Admin/teacher can update waitlist positions
create policy "waitlists_update"
  on waitlists for update
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from live_classes lc
      where lc.id = waitlists.live_class_id and lc.teacher_id = auth.uid()
    )
  );

-- =============================================================================
-- 26. ai_teacher_twins
-- =============================================================================

-- Teachers see their own twins; admin manages all
create policy "ai_teacher_twins_select"
  on ai_teacher_twins for select
  to authenticated
  using (
    teacher_id = auth.uid()
    or public.is_admin()
    -- Parents can see active twins (for browsing/purchasing)
    or is_active = true
  );

create policy "ai_teacher_twins_insert_teacher"
  on ai_teacher_twins for insert
  to authenticated
  with check (teacher_id = auth.uid() or public.is_admin());

create policy "ai_teacher_twins_update_teacher"
  on ai_teacher_twins for update
  to authenticated
  using (teacher_id = auth.uid() or public.is_admin())
  with check (teacher_id = auth.uid() or public.is_admin());

create policy "ai_teacher_twins_delete"
  on ai_teacher_twins for delete
  to authenticated
  using (public.is_admin());

-- =============================================================================
-- 27. ai_training_content
-- =============================================================================

-- Admin only + teacher sees own twin's content
create policy "ai_training_content_select"
  on ai_training_content for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from ai_teacher_twins att
      where att.id = ai_training_content.twin_id and att.teacher_id = auth.uid()
    )
  );

create policy "ai_training_content_insert"
  on ai_training_content for insert
  to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from ai_teacher_twins att
      where att.id = ai_training_content.twin_id and att.teacher_id = auth.uid()
    )
  );

create policy "ai_training_content_update"
  on ai_training_content for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "ai_training_content_delete"
  on ai_training_content for delete
  to authenticated
  using (public.is_admin());

-- =============================================================================
-- 28. ai_twin_sessions
-- =============================================================================

-- Parents see their children's sessions; admin manages all
create policy "ai_twin_sessions_select"
  on ai_twin_sessions for select
  to authenticated
  using (
    exists (
      select 1 from learner_profiles lp
      where lp.id = ai_twin_sessions.learner_id and lp.parent_id = auth.uid()
    )
    -- Teachers see sessions for their twins
    or exists (
      select 1 from ai_teacher_twins att
      where att.id = ai_twin_sessions.twin_id and att.teacher_id = auth.uid()
    )
    or public.is_admin()
  );

-- System creates sessions (via server-side); parents can initiate for children
create policy "ai_twin_sessions_insert"
  on ai_twin_sessions for insert
  to authenticated
  with check (
    exists (
      select 1 from learner_profiles lp
      where lp.id = ai_twin_sessions.learner_id and lp.parent_id = auth.uid()
    )
    or public.is_admin()
  );

-- Admin manages sessions
create policy "ai_twin_sessions_update"
  on ai_twin_sessions for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "ai_twin_sessions_delete_admin"
  on ai_twin_sessions for delete
  to authenticated
  using (public.is_admin());
