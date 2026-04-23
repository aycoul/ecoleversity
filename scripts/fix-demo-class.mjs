import { createClient } from "@supabase/supabase-js";

const url = "https://vhivhqfhpwhrlinjjfwa.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoaXZocWZocHdocmxpbmpqZndhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY2ODM0NCwiZXhwIjoyMDkxMjQ0MzQ0fQ.KvBA37eVY4emmfNDjPjtniNq3VlDO7cXSBxKIOgzl2g";

const supabase = createClient(url, serviceKey);

const classId = "8cafd0c9-69f3-4d22-8f0d-0bf3c0685fa2";

// Set scheduled_at to 5 minutes ago so the class is "LIVE" now
const now = new Date();
const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

console.log("Updating demo class scheduled_at to:", fiveMinAgo);

const { data, error } = await supabase
  .from("live_classes")
  .update({ scheduled_at: fiveMinAgo })
  .eq("id", classId)
  .select();

if (error) {
  console.error("Error:", error.message);
  process.exit(1);
}

console.log("Updated:", data);

// Also check the teacher of this class
const { data: cls } = await supabase
  .from("live_classes")
  .select("id, title, teacher_id, scheduled_at, duration_minutes")
  .eq("id", classId)
  .single();

console.log("\nDemo class now:", cls);

// Get teacher email
const { data: teacher } = await supabase
  .from("profiles")
  .select("id, email, display_name")
  .eq("id", cls.teacher_id)
  .single();

console.log("Teacher:", teacher);

// Get enrolled learners
const { data: enrollments } = await supabase
  .from("enrollments")
  .select("learner_id")
  .eq("live_class_id", classId);

console.log("Enrolled learners:", enrollments);

// Get learner IDs -> parent IDs
for (const e of enrollments ?? []) {
  const { data: learner } = await supabase
    .from("learner_profiles")
    .select("id, first_name, parent_id")
    .eq("id", e.learner_id)
    .single();
  
  const { data: parent } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("id", learner?.parent_id)
    .single();
  
  console.log(`Learner ${learner?.first_name} (${learner?.id}) -> Parent ${parent?.email}`);
}
