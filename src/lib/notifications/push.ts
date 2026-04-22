import webpush from 'web-push';
import type { NotificationPayload } from './types';
import { createAdminClient } from '@/lib/supabase/admin';

function initWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(
    'mailto:contact@ecoleversity.com',
    publicKey,
    privateKey,
  );
  return true;
}

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

async function getUserSubscriptions(userId: string): Promise<PushSubscriptionRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (error) {
    console.error('[push] Error fetching subscriptions:', error);
    return [];
  }
  return data ?? [];
}

function eventToNotification(payload: NotificationPayload): { title: string; body: string; url: string } {
  const { event, data } = payload;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ecoleversity.com';

  switch (event) {
    case 'booking_confirmed':
      return {
        title: 'Reservation confirmee',
        body: `Cours avec ${data.teacherName} le ${data.date}`,
        url: `${appUrl}/dashboard/parent/sessions`,
      };
    case 'payment_confirmed':
      return {
        title: 'Paiement confirme',
        body: `${data.amount} FCFA recu pour le cours avec ${data.teacherName}`,
        url: `${appUrl}/dashboard/parent/sessions`,
      };
    case 'session_reminder_24h':
      return {
        title: 'Rappel : cours demain',
        body: `Cours avec ${data.teacherName} demain a ${data.time}`,
        url: `${appUrl}/dashboard/parent/sessions`,
      };
    case 'session_reminder_15min':
      return {
        title: 'Cours dans 15 minutes !',
        body: `Cours avec ${data.teacherName} a ${data.time}`,
        url: String(data.joinUrl || `${appUrl}/dashboard/bookings`),
      };
    case 'new_message':
      return {
        title: `Message de ${data.senderName}`,
        body: String(data.preview ?? '').slice(0, 100),
        url: `${appUrl}/dashboard/messages`,
      };
    case 'teacher_verified':
      return {
        title: 'Profil verifie !',
        body: 'Votre profil enseignant a ete approuve. Creez votre premier cours !',
        url: `${appUrl}/dashboard/teacher`,
      };
    case 'teacher_rejected':
      return {
        title: 'Verification non approuvee',
        body: 'Mettez a jour votre profil et soumettez une nouvelle demande.',
        url: `${appUrl}/dashboard/teacher/profile`,
      };
    case 'new_review':
      return {
        title: 'Nouvel avis recu',
        body: `${data.reviewerName} a laisse un avis (${'★'.repeat(Number(data.rating || 5))})`,
        url: `${appUrl}/dashboard/teacher/reviews`,
      };
    case 'payout_processed':
      return {
        title: 'Virement effectue',
        body: `${data.amount} FCFA envoye sur ${data.provider}`,
        url: `${appUrl}/dashboard/teacher/earnings`,
      };
    case 'new_enrollment':
      return {
        title: 'Nouvelle inscription',
        body: `Un eleve s'est inscrit a votre cours`,
        url: `${appUrl}/dashboard/teacher`,
      };
    case 'new_follower':
      return {
        title: 'Nouveau follower',
        body: `Quelqu'un suit votre profil`,
        url: `${appUrl}/dashboard/teacher`,
      };
    case 'new_class_from_followed':
      return {
        title: 'Nouveau cours disponible',
        body: `${data.teacherName} a publie un nouveau cours`,
        url: `${appUrl}/classes/${data.classId || ''}`,
      };
    default:
      return {
        title: 'écoleVersity',
        body: 'Vous avez une nouvelle notification',
        url: appUrl,
      };
  }
}

export async function sendPush(payload: NotificationPayload): Promise<void> {
  if (!initWebPush()) {
    console.warn('[push] VAPID keys not set, skipping push notification');
    return;
  }

  try {
    const subscriptions = await getUserSubscriptions(payload.userId);
    if (subscriptions.length === 0) return;

    const notification = eventToNotification(payload);
    const pushPayload = JSON.stringify(notification);

    const supabase = createAdminClient();

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            pushPayload,
          );
        } catch (err) {
          // If subscription expired (410 Gone), remove it
          if (err instanceof webpush.WebPushError && err.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            console.info(`[push] Removed expired subscription ${sub.id}`);
          } else {
            throw err;
          }
        }
      }),
    );

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      console.error(`[push] ${failures.length}/${subscriptions.length} push sends failed`);
    }
  } catch (err) {
    console.error(`[push] Error for ${payload.event}:`, err);
  }
}
