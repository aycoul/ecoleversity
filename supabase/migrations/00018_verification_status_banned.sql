-- verification_status enum lacked a 'banned' value, but the admin
-- strikes flow sets teacher_profiles.verification_status = 'banned'
-- on strike_3. Before this migration, strike_3 would quietly throw
-- a Postgres error. Also blocks the admin verification page filter
-- from listing "not-yet-verified" teachers when the filter tried
-- to exclude 'banned'.
--
-- 'rejected' = admin refused the teacher's initial documents.
-- 'banned'   = teacher was verified, then later banned via strike_3.

alter type verification_status add value if not exists 'banned';
