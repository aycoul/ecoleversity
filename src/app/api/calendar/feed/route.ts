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

    // Simple token verification (hash of userId + secret)
    const crypto = await import("crypto");
    const expectedToken = crypto
      .createHash("sha256")
      .update(`${userId}:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`)
      .digest("hex")
      .slice(0, 16);

    if (token !== expectedToken) {
      return new NextResponse("Invalid token", { status: 401 });
    }

    const supabase = createAdminClient();

    // Fetch upcoming sessions for this user (as teacher or parent's child)
    const { data: sessions } = await supabase
      .from("live_classes")
      .select("id, title, scheduled_at, duration_minutes, jitsi_room_id, teacher_id")
      .in("status", ["scheduled", "live"])
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
        url: `https://meet.jit.si/${s.jitsi_room_id ?? ""}`,
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
