import { createAdminClient } from '@/lib/supabase/admin';

export type NotificationPreferences = {
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  preferred_channel: 'whatsapp' | 'email' | 'push';
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  whatsapp_enabled: true,
  email_enabled: true,
  push_enabled: true,
  preferred_channel: 'whatsapp',
  quiet_hours_start: null,
  quiet_hours_end: null,
};

/**
 * Fetch notification preferences for a user.
 * Creates default row if none exists.
 */
export async function getUserPreferences(
  userId: string,
): Promise<NotificationPreferences> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('notification_preferences')
    .select(
      'whatsapp_enabled, email_enabled, push_enabled, preferred_channel, quiet_hours_start, quiet_hours_end',
    )
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    // Create default preferences for the user
    const { error: insertError } = await supabase
      .from('notification_preferences')
      .insert({ user_id: userId })
      .select()
      .single();

    if (insertError) {
      console.warn(
        `[cascade] Could not create default preferences for ${userId}:`,
        insertError.message,
      );
    }

    return { ...DEFAULT_PREFERENCES };
  }

  return {
    whatsapp_enabled: data.whatsapp_enabled ?? true,
    email_enabled: data.email_enabled ?? true,
    push_enabled: data.push_enabled ?? true,
    preferred_channel: data.preferred_channel ?? 'whatsapp',
    quiet_hours_start: data.quiet_hours_start ?? null,
    quiet_hours_end: data.quiet_hours_end ?? null,
  };
}

/**
 * Check if the current time falls within the user's quiet hours.
 * Uses Africa/Abidjan timezone (GMT+0, Ivory Coast).
 */
export function isInQuietHours(prefs: NotificationPreferences): boolean {
  if (!prefs.quiet_hours_start || !prefs.quiet_hours_end) return false;

  const now = new Date();
  // Ivory Coast is GMT+0 (Africa/Abidjan)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Abidjan',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const currentTime = formatter.format(now);

  const start = prefs.quiet_hours_start.slice(0, 5); // "HH:MM"
  const end = prefs.quiet_hours_end.slice(0, 5);
  const current = currentTime;

  // Handle overnight ranges (e.g., 22:00 to 07:00)
  if (start <= end) {
    return current >= start && current < end;
  }
  return current >= start || current < end;
}

/** Critical events that should bypass quiet hours */
const CRITICAL_EVENTS = new Set([
  'session_reminder_15min',
  'payment_confirmed',
  'booking_confirmed',
]);

/**
 * Determine if notification should be sent based on preferences and quiet hours.
 */
export function shouldNotify(
  prefs: NotificationPreferences,
  event: string,
): boolean {
  // Critical events always go through
  if (CRITICAL_EVENTS.has(event)) return true;

  // Non-critical events respect quiet hours
  return !isInQuietHours(prefs);
}
