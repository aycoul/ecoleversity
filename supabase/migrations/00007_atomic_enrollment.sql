-- Atomic enrollment function to prevent TOCTOU race condition
-- Checks enrollment count and inserts within a single transaction
CREATE OR REPLACE FUNCTION enroll_learner_atomic(
  p_learner_id UUID,
  p_live_class_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_students INT;
  v_current_count INT;
  v_class_status TEXT;
  v_enrollment_id UUID;
BEGIN
  -- Lock the live_class row to prevent concurrent enrollment
  SELECT max_students, status INTO v_max_students, v_class_status
  FROM live_classes
  WHERE id = p_live_class_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'class_not_found');
  END IF;

  IF v_class_status != 'scheduled' THEN
    RETURN json_build_object('error', 'class_not_available');
  END IF;

  -- Check if already enrolled
  IF EXISTS (
    SELECT 1 FROM enrollments
    WHERE live_class_id = p_live_class_id AND learner_id = p_learner_id
  ) THEN
    RETURN json_build_object('error', 'already_enrolled');
  END IF;

  -- Count current enrollments (within the lock)
  SELECT COUNT(*) INTO v_current_count
  FROM enrollments
  WHERE live_class_id = p_live_class_id;

  IF v_current_count >= v_max_students THEN
    RETURN json_build_object('error', 'class_full', 'current_count', v_current_count);
  END IF;

  -- Insert enrollment atomically
  INSERT INTO enrollments (learner_id, live_class_id)
  VALUES (p_learner_id, p_live_class_id)
  RETURNING id INTO v_enrollment_id;

  RETURN json_build_object('success', true, 'enrollment_id', v_enrollment_id);
END;
$$;
