import { createClient } from "@supabase/supabase-js";

const url = "https://vhivhqfhpwhrlinjjfwa.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoaXZocWZocHdocmxpbmpqZndhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY2ODM0NCwiZXhwIjoyMDkxMjQ0MzQ0fQ.KvBA37eVY4emmfNDjPjtniNq3VlDO7cXSBxKIOgzl2g";

const supabase = createClient(url, serviceKey);

// List auth users
const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
if (usersErr) console.error("users error:", usersErr.message);

console.log("=== AUTH USERS ===");
for (const u of usersData?.users ?? []) {
  console.log(`- ${u.email} | id=${u.id} | role=${u.user_metadata?.role ?? "N/A"}`);
}

// List all profiles
const { data: profiles, error: profErr } = await supabase
  .from("profiles")
  .select("id, email, display_name, role")
  .limit(50);

if (profErr) console.error("profiles error:", profErr.message);
console.log("\n=== PROFILES ===");
for (const p of profiles ?? []) {
  console.log(`- ${p.email} | id=${p.id} | role=${p.role} | name=${p.display_name}`);
}

// Check learner_profiles
const { data: learners } = await supabase
  .from("learner_profiles")
  .select("id, first_name, parent_id")
  .limit(20);

console.log("\n=== LEARNER PROFILES ===");
for (const l of learners ?? []) {
  console.log(`- ${l.first_name} | id=${l.id} | parent=${l.parent_id}`);
}
