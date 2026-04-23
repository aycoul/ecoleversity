import { createClient } from "@supabase/supabase-js";

const url = "https://vhivhqfhpwhrlinjjfwa.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoaXZocWZocHdocmxpbmpqZndhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY2ODM0NCwiZXhwIjoyMDkxMjQ0MzQ0fQ.KvBA37eVY4emmfNDjPjtniNq3VlDO7cXSBxKIOgzl2g";

const supabase = createClient(url, serviceKey);

console.log("=== LIVE CLASSES (all columns) ===");
const { data: liveClasses, error: lcErr } = await supabase
  .from("live_classes")
  .select("*")
  .order("created_at", { ascending: false })
  .limit(20);

if (lcErr) console.error("live_classes error:", lcErr.message);
for (const c of liveClasses ?? []) {
  const end = new Date(new Date(c.scheduled_at).getTime() + c.duration_minutes * 60 * 1000);
  const now = new Date();
  console.log(`- ID=${c.id} | title=${c.title} | format=${c.format} | status=${c.status} | scheduled=${c.scheduled_at} | duration=${c.duration_minutes} | ended=${end < now} | price=${c.price_xof} | teacher=${c.teacher_id} | recording_url=${c.recording_url ? "YES" : "NO"}`);
}

console.log("\n=== COURSES (video courses) ===");
const { data: courses, error: cErr } = await supabase
  .from("courses")
  .select("*")
  .order("created_at", { ascending: false })
  .limit(20);

if (cErr) console.error("courses error:", cErr.message);
for (const c of courses ?? []) {
  console.log(`- ID=${c.id} | title=${c.title} | status=${c.status} | price=${c.price_xof} | teacher=${c.teacher_id}`);
}

console.log("\n=== TEST PARENT LEARNERS ===");
const { data: parentUser } = await supabase
  .from("profiles")
  .select("id, email")
  .eq("email", "test-parent-e2e@ecoleversity.dev")
  .single();

console.log("Parent user:", parentUser ?? "NOT FOUND");

if (parentUser) {
  const { data: learners } = await supabase
    .from("learner_profiles")
    .select("id, first_name, parent_id")
    .eq("parent_id", parentUser.id);
  console.log("Learners:", learners ?? []);
}

console.log("\n=== TEST TEACHER ===");
const { data: teacherUser } = await supabase
  .from("profiles")
  .select("id, email")
  .eq("email", "test-teacher-e2e@ecoleversity.dev")
  .single();
console.log("Teacher user:", teacherUser ?? "NOT FOUND");

console.log("\n=== ENROLLMENTS ===");
const { data: allEnrollments } = await supabase
  .from("enrollments")
  .select("*")
  .limit(20);
console.log("All enrollments:", allEnrollments ?? []);
