import { createClient } from "@supabase/supabase-js";

const url = "https://vhivhqfhpwhrlinjjfwa.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoaXZocWZocHdocmxpbmpqZndhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY2ODM0NCwiZXhwIjoyMDkxMjQ0MzQ0fQ.KvBA37eVY4emmfNDjPjtniNq3VlDO7cXSBxKIOgzl2g";

const supabase = createClient(url, serviceKey);

const classId = "8cafd0c9-69f3-4d22-8f0d-0bf3c0685fa2";

// Set to April 21 midnight UTC with 72h duration — covers Apr 21-24
const liveTime = "2026-04-21T00:00:00+00:00";
const durationHours = 72;

console.log("Setting demo class:");
console.log("  scheduled_at:", liveTime);
console.log("  duration_minutes:", durationHours * 60);

const { data, error } = await supabase
  .from("live_classes")
  .update({ 
    scheduled_at: liveTime,
    duration_minutes: durationHours * 60
  })
  .eq("id", classId)
  .select("id, title, scheduled_at, duration_minutes, teacher_id");

if (error) {
  console.error("Error:", error.message);
  process.exit(1);
}

console.log("\nUpdated:", data);

const start = new Date(liveTime);
const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
console.log("\nClass is LIVE from:", start.toISOString());
console.log("Until:", end.toISOString());
console.log("Server now:", new Date().toISOString());
