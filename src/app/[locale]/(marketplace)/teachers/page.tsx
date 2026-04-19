import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TeacherCatalog } from "@/components/teacher/teacher-catalog";

type SearchParams = {
  q?: string;
  subject?: string;
  grade?: string;
  city?: string;
};

export default async function TeacherCatalogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { q, subject, grade, city } = params;

  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("teacher_profiles")
    .select(`
      id,
      subjects,
      grade_levels,
      verification_status,
      rating_avg,
      rating_count,
      follower_count,
      profiles!teacher_profiles_id_fkey (
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

  const { data: rawTeachers } = await query
    .order("rating_avg", { ascending: false })
    .order("rating_count", { ascending: false });

  // Post-filter for city and text search (cross-table filters)
  const teachers = (rawTeachers ?? [])
    .filter((t) => {
      const profile = t.profiles as unknown as {
        id: string;
        display_name: string;
        avatar_url: string | null;
        city: string | null;
      } | null;

      if (!profile) return false;
      if (city && profile.city !== city) return false;
      if (q) {
        const search = q.toLowerCase();
        const name = (profile.display_name ?? "").toLowerCase();
        if (!name.includes(search)) return false;
      }
      return true;
    })
    .map((t) => {
      const profile = t.profiles as unknown as {
        id: string;
        display_name: string;
        avatar_url: string | null;
        city: string | null;
      };

      return {
        id: profile.id,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        city: profile.city,
        subjects: (t.subjects ?? []) as string[],
        grade_levels: (t.grade_levels ?? []) as string[],
        rating_avg: Number(t.rating_avg) || 0,
        rating_count: t.rating_count ?? 0,
        verification_status: t.verification_status,
      };
    });

  return (
    <TeacherCatalog
      teachers={teachers}
      initialFilters={{ q, subject, grade, city }}
    />
  );
}
