import { createClient } from "@supabase/supabase-js";

const url = "https://vhivhqfhpwhrlinjjfwa.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoaXZocWZocHdocmxpbmpqZndhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY2ODM0NCwiZXhwIjoyMDkxMjQ0MzQ0fQ.KvBA37eVY4emmfNDjPjtniNq3VlDO7cXSBxKIOgzl2g";

const supabase = createClient(url, serviceKey);

const classId = "8cafd0c9-69f3-4d22-8f0d-0bf3c0685fa2";

// Set to April 21, 2026 at 07:00 UTC — this should be "live now" for the user
// With 480 min duration, it ends at 15:00 UTC same day
const liveTime = "2026-04-21T07:00:00+00:00";

console.log("Setting demo class scheduled_at to:", liveTime);

const { data, error } = await supabase
  .from("live_classes")
  .update({ scheduled_at: liveTime })
  .eq("id", classId)
  .select("id, title, scheduled_at, duration_minutes, teacher_id");

if (error) {
  console.error("Error:", error.message);
  process.exit(1);
}

console.log("Updated:", data);

// Verify
const start = new Date(liveTime);
const end = new Date(start.getTime() + 480 * 60 * 1000);
console.log("Class starts:", start.toISOString());
console.log("Class ends:", end.toISOString());
console.log("Now (server):", new Date().toISOString());
