import { createAdminClient } from "@/lib/supabase/admin";
import { RoomServiceClient } from "livekit-server-sdk";
import { getRoomName } from "@/lib/video/livekit";

export type ClassRow = {
  id: string;
  title: string | null;
  subject: string;
  gradeLevel: string;
  scheduledAt: string;
  durationMinutes: number;
  teacherId: string;
  teacherName: string;
  enrolledCount: number;
  status: string;
  /** Live participants reported by LiveKit (only set for ongoing rooms). */
  liveParticipants?: number;
};

export type LiveOpsSnapshot = {
  /** Sessions whose start <= now <= end window AND a LiveKit room exists. */
  ongoing: ClassRow[];
  /** Today's scheduled sessions (not yet started or completed). */
  today: ClassRow[];
  /** This week's scheduled sessions, Mon–Sun (UTC), excluding past days. */
  week: ClassRow[];
  totals: {
    ongoingCount: number;
    todayCount: number;
    weekCount: number;
    livePeopleCount: number;
    activeRoomCount: number;
  };
  /** When this snapshot was assembled — for the auto-refresh badge. */
  generatedAt: string;
};

function startOfDayUtc(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function endOfDayUtc(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
}

function startOfWeekUtc(d: Date): Date {
  // ISO week: Monday is day 1.
  const x = startOfDayUtc(d);
  const dayNum = (x.getUTCDay() + 6) % 7; // Monday = 0
  x.setUTCDate(x.getUTCDate() - dayNum);
  return x;
}

function endOfWeekUtc(d: Date): Date {
  const start = startOfWeekUtc(d);
  const x = new Date(start);
  x.setUTCDate(x.getUTCDate() + 6);
  return endOfDayUtc(x);
}

export async function loadLiveOps(): Promise<LiveOpsSnapshot> {
  const supabase = createAdminClient();
  const now = new Date();
  const dayStart = startOfDayUtc(now);
  const dayEnd = endOfDayUtc(now);
  const weekStart = startOfWeekUtc(now);
  const weekEnd = endOfWeekUtc(now);

  // We pull the wider window and bucketize in JS — one query, three views.
  const { data: rows } = await supabase
    .from("live_classes")
    .select("id, title, subject, grade_level, scheduled_at, duration_minutes, teacher_id, status")
    .gte("scheduled_at", weekStart.toISOString())
    .lte("scheduled_at", weekEnd.toISOString())
    .order("scheduled_at", { ascending: true });

  const allClasses = rows ?? [];
  const teacherIds = Array.from(new Set(allClasses.map((c) => c.teacher_id as string)));
  const classIds = allClasses.map((c) => c.id as string);

  const [{ data: teachers }, { data: enrollments }] = await Promise.all([
    teacherIds.length
      ? supabase.from("profiles").select("id, display_name").in("id", teacherIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string | null }[] }),
    classIds.length
      ? supabase.from("enrollments").select("live_class_id").in("live_class_id", classIds)
      : Promise.resolve({ data: [] as { live_class_id: string }[] }),
  ]);

  const teacherName = new Map(
    (teachers ?? []).map((t) => [t.id as string, (t.display_name as string) ?? "—"])
  );
  const enrolledByClass = new Map<string, number>();
  for (const e of enrollments ?? []) {
    const k = e.live_class_id as string;
    enrolledByClass.set(k, (enrolledByClass.get(k) ?? 0) + 1);
  }

  // Try the LiveKit listRooms call. If creds are missing or LiveKit is
  // unreachable, fall back to "no live data" and keep the rest of the
  // snapshot useful.
  let liveByRoom = new Map<string, number>();
  let activeRoomCount = 0;
  let livePeopleCount = 0;
  try {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const host = process.env.LIVEKIT_URL?.replace(/^wss?:\/\//, "https://");
    if (apiKey && apiSecret && host) {
      const client = new RoomServiceClient(host, apiKey, apiSecret);
      const roomNames = classIds.map((id) => getRoomName(id));
      const rooms = await client.listRooms(roomNames);
      for (const r of rooms ?? []) {
        liveByRoom.set(r.name, r.numParticipants ?? 0);
        if ((r.numParticipants ?? 0) > 0) {
          activeRoomCount += 1;
          livePeopleCount += r.numParticipants ?? 0;
        }
      }
    }
  } catch (err) {
    console.error("[live-ops] listRooms failed:", (err as Error).message);
  }

  function decorate(c: typeof allClasses[number]): ClassRow {
    const id = c.id as string;
    const liveCount = liveByRoom.get(getRoomName(id));
    return {
      id,
      title: (c.title as string | null) ?? null,
      subject: (c.subject as string) ?? "—",
      gradeLevel: (c.grade_level as string) ?? "—",
      scheduledAt: c.scheduled_at as string,
      durationMinutes: (c.duration_minutes as number) ?? 0,
      teacherId: c.teacher_id as string,
      teacherName: teacherName.get(c.teacher_id as string) ?? "—",
      enrolledCount: enrolledByClass.get(id) ?? 0,
      status: (c.status as string) ?? "scheduled",
      liveParticipants: liveCount,
    };
  }

  // Bucketize.
  const today: ClassRow[] = [];
  const week: ClassRow[] = [];
  const ongoing: ClassRow[] = [];
  const startWindowFor = (start: Date, durationMin: number) =>
    new Date(start.getTime() + durationMin * 60 * 1000);

  for (const c of allClasses) {
    const decorated = decorate(c);
    const start = new Date(decorated.scheduledAt);
    const end = startWindowFor(start, decorated.durationMinutes);
    week.push(decorated);
    if (start >= dayStart && start <= dayEnd) {
      today.push(decorated);
    }
    // Ongoing = currently between scheduled_at - 5min (room can warm up)
    // and scheduled_at + duration. Or status='live'. Or LiveKit room
    // has live participants right now.
    const warmStart = new Date(start.getTime() - 5 * 60 * 1000);
    const isInWindow = now >= warmStart && now <= end;
    const hasLive = (decorated.liveParticipants ?? 0) > 0;
    if (isInWindow || decorated.status === "live" || hasLive) {
      ongoing.push(decorated);
    }
  }

  return {
    ongoing,
    today,
    week,
    totals: {
      ongoingCount: ongoing.length,
      todayCount: today.length,
      weekCount: week.length,
      livePeopleCount,
      activeRoomCount,
    },
    generatedAt: new Date().toISOString(),
  };
}

export type SessionDetail = {
  classRow: {
    id: string;
    title: string | null;
    subject: string;
    gradeLevel: string;
    scheduledAt: string;
    durationMinutes: number;
    status: string;
    description: string | null;
    format: string;
    maxStudents: number;
    priceXof: number;
    teacherId: string;
    teacherName: string;
  };
  learners: Array<{
    learnerId: string;
    firstName: string;
    gradeLevel: string;
    age: number | null;
    avatarUrl: string | null;
    parentId: string;
    parentName: string;
    enrolledAt: string;
  }>;
};

export async function loadSessionDetail(liveClassId: string): Promise<SessionDetail | null> {
  const supabase = createAdminClient();
  const { data: c } = await supabase
    .from("live_classes")
    .select("id, title, description, subject, grade_level, scheduled_at, duration_minutes, format, max_students, price_xof, status, teacher_id")
    .eq("id", liveClassId)
    .maybeSingle();
  if (!c) return null;

  const { data: teacher } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", c.teacher_id as string)
    .maybeSingle();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("learner_id, enrolled_at")
    .eq("live_class_id", liveClassId);

  const learnerIds = (enrollments ?? []).map((e) => e.learner_id as string);
  const enrolledAtById = new Map(
    (enrollments ?? []).map((e) => [e.learner_id as string, e.enrolled_at as string])
  );

  const { data: learners } = learnerIds.length
    ? await supabase
        .from("learner_profiles")
        .select("id, first_name, grade_level, birth_year, avatar_url, parent_id")
        .in("id", learnerIds)
    : { data: [] };

  const parentIds = Array.from(new Set((learners ?? []).map((l) => l.parent_id as string)));
  const { data: parents } = parentIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", parentIds)
    : { data: [] };
  const parentName = new Map(
    (parents ?? []).map((p) => [p.id as string, (p.display_name as string) ?? "—"])
  );

  const currentYear = new Date().getUTCFullYear();
  const learnerRows = (learners ?? []).map((l) => {
    const by = l.birth_year as number | null;
    return {
      learnerId: l.id as string,
      firstName: (l.first_name as string) ?? "—",
      gradeLevel: (l.grade_level as string) ?? "—",
      age: by ? currentYear - by : null,
      avatarUrl: (l.avatar_url as string | null) ?? null,
      parentId: l.parent_id as string,
      parentName: parentName.get(l.parent_id as string) ?? "—",
      enrolledAt: enrolledAtById.get(l.id as string) ?? "",
    };
  });

  return {
    classRow: {
      id: c.id as string,
      title: (c.title as string | null) ?? null,
      subject: (c.subject as string) ?? "—",
      gradeLevel: (c.grade_level as string) ?? "—",
      scheduledAt: c.scheduled_at as string,
      durationMinutes: (c.duration_minutes as number) ?? 0,
      status: (c.status as string) ?? "scheduled",
      description: (c.description as string | null) ?? null,
      format: (c.format as string) ?? "group",
      maxStudents: (c.max_students as number) ?? 0,
      priceXof: (c.price_xof as number) ?? 0,
      teacherId: c.teacher_id as string,
      teacherName: (teacher?.display_name as string) ?? "—",
    },
    learners: learnerRows.sort((a, b) => a.firstName.localeCompare(b.firstName)),
  };
}
