import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const searchParamsSchema = z.object({
  subject: z.string().optional(),
  grade: z.string().optional(),
  city: z.string().optional(),
  q: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const parsed = searchParamsSchema.safeParse({
      subject: searchParams.get("subject") ?? undefined,
      grade: searchParams.get("grade") ?? undefined,
      city: searchParams.get("city") ?? undefined,
      q: searchParams.get("q") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { subject, grade, city, q } = parsed.data;

    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from("teacher_profiles")
      .select(`
        id,
        user_id,
        subjects,
        grade_levels,
        verification_status,
        rating_avg,
        rating_count,
        follower_count,
        profiles!teacher_profiles_user_id_fkey (
          id,
          display_name,
          avatar_url,
          city
        )
      `)
      .eq("verification_status", "fully_verified");

    if (subject) {
      query = query.contains("subjects", [subject]);
    }

    if (grade) {
      query = query.contains("grade_levels", [grade]);
    }

    if (city) {
      query = query.filter(
        "profiles.city",
        "eq",
        city
      );
    }

    const { data: teachers, error } = await query
      .order("rating_avg", { ascending: false })
      .order("rating_count", { ascending: false });

    if (error) {
      console.error("Teacher search error:", error);
      return NextResponse.json(
        { error: "Failed to search teachers" },
        { status: 500 }
      );
    }

    // Post-filter: text search on display_name and city filter
    // (Supabase doesn't support ilike on joined tables in .filter())
    let results = (teachers ?? []).filter((t) => {
      const profile = t.profiles as unknown as {
        id: string;
        display_name: string;
        avatar_url: string | null;
        city: string | null;
      } | null;

      if (!profile) return false;

      // City filter (post-filter since cross-table filter may not work)
      if (city && profile.city !== city) return false;

      // Text search on display_name
      if (q) {
        const search = q.toLowerCase();
        const name = (profile.display_name ?? "").toLowerCase();
        if (!name.includes(search)) return false;
      }

      return true;
    });

    const mapped = results.map((t) => {
      const profile = t.profiles as unknown as {
        id: string;
        display_name: string;
        avatar_url: string | null;
        city: string | null;
      };

      return {
        id: t.user_id,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        city: profile.city,
        subjects: t.subjects ?? [],
        grade_levels: t.grade_levels ?? [],
        rating_avg: Number(t.rating_avg) || 0,
        rating_count: t.rating_count ?? 0,
        verification_status: t.verification_status,
      };
    });

    return NextResponse.json(mapped);
  } catch (err) {
    console.error("Teacher search error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
