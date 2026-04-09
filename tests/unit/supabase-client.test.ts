import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Supabase SSR module before importing
vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(() => ({ from: vi.fn() })),
}));

describe("Supabase browser client", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  it("creates a browser client with env vars", async () => {
    const { createBrowserClient } = await import("@supabase/ssr");
    const { createClient } = await import("@/lib/supabase/client");

    const client = createClient();

    expect(createBrowserClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key"
    );
    expect(client).toBeDefined();
    expect(client.from).toBeDefined();
  });
});
