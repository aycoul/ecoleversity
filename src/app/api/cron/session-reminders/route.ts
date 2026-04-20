import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotification } from "@/lib/notifications/service";

/**
 * Session-reminder cron.
 *
 * Fires every 5 minutes (see vercel.ts). Finds scheduled live_classes
 * starting in 10–20 minutes that haven't been reminded yet, and
 * notifies each enrolled parent + the teacher. Sets reminder_sent_at
 * on the class so subsequent cron runs don't double-fire.
 *
 * The 10-minute floor + 5-minute cron gives one firing per session
 * in practice: the first cron after a session enters the 10–20 min
 * window hits it, marks reminder_sent_at, and the next cron skips it.
 */

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

async function handle(request: NextRequest) {
  // Vercel Cron passes Authorization: Bearer $CRON_SECRET when the
  // job fires. Reject anything else so random callers can't DDoS the
  // notifications cascade.
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || header !== expected) {
    return unauthorized();
  }

  const admin = createAdminClient();
  const now = Date.now();
  const floorIso = new Date(now + 10 * 60 * 1000).toISOString();
  const ceilIso = new Date(now + 20 * 60 * 1000).toISOString();

  const { data: due } = await admin
    .from("live_classes")
    .select(
      "id, title, subject, teacher_id, scheduled_at, duration_minutes"
    )
    .eq("status", "scheduled")
    .is("reminder_sent_at", null)
    .gte("scheduled_at", floorIso)
    .lte("scheduled_at", ceilIso);

  const results: Array<{
    classId: string;
    notified: number;
    error?: string;
  }> = [];

  for (const cls of due ?? []) {
    try {
      const classId = cls.id as string;

      // Enrolled parents for this class: enrollments → learner_profiles.parent_id
      const { data: enrollmentRows } = await admin
        .from("enrollments")
        .select("learner_id")
        .eq("live_class_id", classId);

      const learnerIds = (enrollmentRows ?? [])
        .map((e) => e.learner_id as string | null)
        .filter((id): id is string => !!id);

      const { data: learnerRows } =
        learnerIds.length > 0
          ? await admin
              .from("learner_profiles")
              .select("parent_id, first_name")
              .in("id", learnerIds)
          : { data: [] };

      const parentIds = Array.from(
        new Set(
          (learnerRows ?? []).map((l) => l.parent_id as string)
        )
      );

      // Teacher display name for the template body
      const { data: teacherProfile } = await admin
        .from("profiles")
        .select("display_name")
        .eq("id", cls.teacher_id as string)
        .maybeSingle();

      const teacherName =
        (teacherProfile?.display_name as string | undefined) ??
        "votre enseignant";

      // The join URL points directly to the LiveKit room — same URL
      // sent to both the teacher and enrolled parents; /session/[id]
      // authorizes each role independently on the server.
      const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ecoleversity.com";
      const joinUrl = `${site}/fr/session/${classId}`;
      const commonData = {
        teacherName,
        joinUrl,
        classTitle: (cls.title as string) ?? "",
      };

      let notified = 0;

      // Fire to each enrolled parent
      for (const parentId of parentIds) {
        try {
          await sendNotification({
            event: "session_reminder_15min",
            userId: parentId,
            data: commonData,
          });
          notified += 1;
        } catch (err) {
          console.error(
            "[cron/session-reminders] parent notify failed:",
            parentId,
            (err as Error).message,
          );
        }
      }

      // Fire to the teacher
      try {
        await sendNotification({
          event: "session_reminder_15min",
          userId: cls.teacher_id as string,
          data: commonData,
        });
        notified += 1;
      } catch (err) {
        console.error(
          "[cron/session-reminders] teacher notify failed:",
          cls.teacher_id,
          (err as Error).message,
        );
      }

      // Mark reminder sent regardless of partial failures — we'd rather
      // miss one recipient than spam everyone 5 minutes later.
      await admin
        .from("live_classes")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", classId);

      results.push({ classId, notified });
    } catch (err) {
      results.push({
        classId: cls.id as string,
        notified: 0,
        error: (err as Error).message,
      });
    }
  }

  return NextResponse.json({
    data: { windowMinutes: [10, 20], processed: results.length, results },
  });
}

export const GET = handle;
export const POST = handle;
