import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createEvents, type EventAttributes } from "ics";

/** GET: Generate iCal feed for a user's upcoming sessions */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const token = searchParams.get("token");

    if (!userId || !token) {
      return new NextResponse("Missing parameters", { status: 400 });
    }

    // Dedicated HMAC secret — never reuse SUPABASE_SERVICE_ROLE_KEY for
    // app-level signing. Falling back to the service-role key would mean
    // every leaked calendar URL is a 128-bit prefix of an HMAC keyed
    // with the platform's most sensitive secret.
    const secret = process.env.CALENDAR_FEED_SECRET;
    if (!secret) {
      console.error("[calendar] CALENDAR_FEED_SECRET not configured");
      return new NextResponse("Calendar feed not configured", { status: 503 });
    }

    const crypto = await import("crypto");
    const expected = crypto
      .createHmac("sha256", secret)
      .update(userId)
      .digest("hex")
      .slice(0, 32);

    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return new NextResponse("Invalid token", { status: 401 });
    }

    const supabase = createAdminClient();

    // Get user's learner IDs (if parent) for enrollment-based filtering
    const { data: learners } = await supabase
      .from("learner_profiles")
      .select("id")
      .eq("parent_id", userId);

    const learnerIds = (learners ?? []).map((l) => l.id);

    // Fetch enrolled class IDs for this user's children
    const { data: enrollments } = learnerIds.length > 0
      ? await supabase
          .from("enrollments")
          .select("live_class_id")
          .in("learner_id", learnerIds)
      : { data: [] };

    const enrolledClassIds = (enrollments ?? []).map((e) => e.live_class_id).filter(Boolean);

    // Fetch sessions: teacher's own classes OR enrolled classes
    const classFilter = enrolledClassIds.length > 0
      ? `teacher_id.eq.${userId},id.in.(${enrolledClassIds.join(",")})`
      : `teacher_id.eq.${userId}`;

    const { data: sessions } = await supabase
      .from("live_classes")
      .select("id, title, scheduled_at, duration_minutes, teacher_id")
      .in("status", ["scheduled", "live"])
      .or(classFilter)
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(50);

    if (!sessions || sessions.length === 0) {
      const { value: emptyCalendar } = createEvents([]);
      return new NextResponse(emptyCalendar ?? "", {
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": "attachment; filename=ecoleversity.ics",
        },
      });
    }

    const events: EventAttributes[] = sessions.map((s) => {
      const start = new Date(s.scheduled_at);
      return {
        title: s.title ?? "Cours écoleVersity",
        start: [
          start.getFullYear(),
          start.getMonth() + 1,
          start.getDate(),
          start.getHours(),
          start.getMinutes(),
        ] as [number, number, number, number, number],
        duration: { minutes: s.duration_minutes ?? 30 },
        description: `Cours en direct sur écoleVersity`,
        url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://ecoleversity.com"}/fr/session/${s.id}`,
        status: "CONFIRMED" as const,
        organizer: { name: "écoleVersity" },
      };
    });

    const { value: calendar, error } = createEvents(events);

    if (error || !calendar) {
      console.error("[calendar] ICS generation error:", error);
      return new NextResponse("Error generating calendar", { status: 500 });
    }

    return new NextResponse(calendar, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": "attachment; filename=ecoleversity.ics",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    console.error("[calendar] Error:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
