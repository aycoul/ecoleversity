-- Prevent double-booking: only one active class per teacher per timeslot
CREATE UNIQUE INDEX idx_unique_teacher_timeslot
  ON live_classes (teacher_id, scheduled_at)
  WHERE status IN ('scheduled', 'live');
