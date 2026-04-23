import { describe, it, expect, vi } from "vitest";
import { getAuthRedirect } from "@/lib/auth-redirect";
import type { SupabaseClient } from "@supabase/supabase-js";

// Minimal Supabase client mock — only what getAuthRedirect actually calls
function mockSupabase({
  user,
  profile,
  learnerCount,
}: {
  user: { id: string; user_metadata?: Record<string, string> } | null;
  profile?: { role: string; verification_status?: string } | null;
  learnerCount?: number;
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: profile ?? null }),
            }),
          }),
        };
      }
      if (table === "learner_profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: learnerCount ?? 0 }),
          }),
        };
      }
      return {};
    }),
  } as unknown as SupabaseClient;
}

describe("getAuthRedirect", () => {
  it("redirects unauthenticated users to /login", async () => {
    const supabase = mockSupabase({ user: null });
    const result = await getAuthRedirect(supabase);
    expect(result.path).toBe("/login");
    expect(result.role).toBeNull();
  });

  it("redirects admin to /dashboard/admin", async () => {
    const supabase = mockSupabase({
      user: { id: "admin-1" },
      profile: { role: "admin" },
    });
    const result = await getAuthRedirect(supabase);
    expect(result.path).toBe("/dashboard/admin");
    expect(result.role).toBe("admin");
  });

  it("redirects school_admin to /dashboard/admin", async () => {
    const supabase = mockSupabase({
      user: { id: "school-1" },
      profile: { role: "school_admin" },
    });
    const result = await getAuthRedirect(supabase);
    expect(result.path).toBe("/dashboard/admin");
    expect(result.role).toBe("school_admin");
  });

  it("redirects verified teacher to /dashboard/teacher", async () => {
    const supabase = mockSupabase({
      user: { id: "teacher-1" },
      profile: { role: "teacher", verification_status: "fully_verified" },
    });
    const result = await getAuthRedirect(supabase);
    expect(result.path).toBe("/dashboard/teacher");
    expect(result.role).toBe("teacher");
  });

  it("redirects pending teacher to onboarding", async () => {
    const supabase = mockSupabase({
      user: { id: "teacher-2" },
      profile: { role: "teacher", verification_status: "pending" },
    });
    const result = await getAuthRedirect(supabase);
    expect(result.path).toBe("/onboarding/teacher");
  });

  it("redirects parent with children to /dashboard/parent", async () => {
    const supabase = mockSupabase({
      user: { id: "parent-1" },
      profile: { role: "parent" },
      learnerCount: 2,
    });
    const result = await getAuthRedirect(supabase);
    expect(result.path).toBe("/dashboard/parent");
    expect(result.role).toBe("parent");
  });

  it("redirects parent without children to onboarding", async () => {
    const supabase = mockSupabase({
      user: { id: "parent-2" },
      profile: { role: "parent" },
      learnerCount: 0,
    });
    const result = await getAuthRedirect(supabase);
    expect(result.path).toBe("/onboarding/parent");
  });

  it("redirects new user (no profile) with teacher metadata to teacher onboarding", async () => {
    const supabase = mockSupabase({
      user: { id: "new-1", user_metadata: { role: "teacher" } },
      profile: null,
    });
    const result = await getAuthRedirect(supabase);
    expect(result.path).toBe("/onboarding/teacher");
    expect(result.role).toBe("teacher");
  });

  it("redirects new user (no profile) without metadata to parent onboarding", async () => {
    const supabase = mockSupabase({
      user: { id: "new-2" },
      profile: null,
    });
    const result = await getAuthRedirect(supabase);
    expect(result.path).toBe("/onboarding/parent");
    expect(result.role).toBe("parent");
  });
});
