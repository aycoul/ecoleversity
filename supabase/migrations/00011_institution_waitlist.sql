-- Institution registration waitlist
CREATE TABLE institution_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('private_school', 'tutoring_center', 'academy')),
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  city TEXT NOT NULL,
  teacher_count INT NOT NULL DEFAULT 1,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No RLS needed — API uses admin client for inserts, admin reads
ALTER TABLE institution_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "institution_waitlist_admin_read" ON institution_waitlist
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
