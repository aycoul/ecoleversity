import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NotificationSettings } from '@/components/settings/notification-settings';

export default async function NotificationSettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const t = await getTranslations('settings');

  // Fetch existing preferences
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('notifications')}</p>
      </div>

      <NotificationSettings
        userId={user.id}
        initialPrefs={
          prefs ?? {
            whatsapp_enabled: true,
            email_enabled: true,
            push_enabled: true,
            preferred_channel: 'whatsapp',
            quiet_hours_start: null,
            quiet_hours_end: null,
          }
        }
      />
    </div>
  );
}
