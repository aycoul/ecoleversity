'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

type NotificationPrefs = {
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  preferred_channel: 'whatsapp' | 'email' | 'push';
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
};

type Props = {
  userId: string;
  initialPrefs: NotificationPrefs;
};

export function NotificationSettings({ userId, initialPrefs }: Props) {
  const t = useTranslations('settings');
  const [prefs, setPrefs] = useState<NotificationPrefs>(initialPrefs);
  const [isPending, startTransition] = useTransition();

  function updateField<K extends keyof NotificationPrefs>(
    key: K,
    value: NotificationPrefs[K],
  ) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    startTransition(async () => {
      const supabase = createClient();

      const { error } = await supabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: userId,
            whatsapp_enabled: prefs.whatsapp_enabled,
            email_enabled: prefs.email_enabled,
            push_enabled: prefs.push_enabled,
            preferred_channel: prefs.preferred_channel,
            quiet_hours_start: prefs.quiet_hours_start,
            quiet_hours_end: prefs.quiet_hours_end,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        );

      if (error) {
        console.error('[notification-settings] Save error:', error);
        toast.error(t('saveError'));
      } else {
        toast.success(t('saved'));
      }
    });
  }

  const channels = [
    { value: 'whatsapp' as const, label: t('whatsapp'), icon: '💬' },
    { value: 'email' as const, label: t('email'), icon: '📧' },
    { value: 'push' as const, label: t('push'), icon: '🔔' },
  ];

  const toggles = [
    {
      key: 'whatsapp_enabled' as const,
      label: t('whatsapp'),
      value: prefs.whatsapp_enabled,
    },
    {
      key: 'email_enabled' as const,
      label: t('email'),
      value: prefs.email_enabled,
    },
    {
      key: 'push_enabled' as const,
      label: t('push'),
      value: prefs.push_enabled,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Preferred channel */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          {t('preferredChannel')}
        </h2>
        <div className="mt-4 space-y-3">
          {channels.map((ch) => (
            <label
              key={ch.value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 has-[:checked]:border-[var(--ev-green)] has-[:checked]:bg-[var(--ev-green-50)]"
            >
              <input
                type="radio"
                name="preferred_channel"
                value={ch.value}
                checked={prefs.preferred_channel === ch.value}
                onChange={() => updateField('preferred_channel', ch.value)}
                className="size-4 text-[var(--ev-blue)] focus:ring-[var(--ev-green)]"
              />
              <span className="text-lg">{ch.icon}</span>
              <span className="text-sm font-medium text-slate-700">
                {ch.label}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* Channel toggles */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          {t('channels')}
        </h2>
        <div className="mt-4 space-y-4">
          {toggles.map((toggle) => (
            <div
              key={toggle.key}
              className="flex items-center justify-between"
            >
              <span className="text-sm font-medium text-slate-700">
                {toggle.label}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={toggle.value}
                onClick={() => updateField(toggle.key, !toggle.value)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  toggle.value ? 'bg-[var(--ev-green)]' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                    toggle.value ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="ml-2 text-xs text-slate-500">
                {toggle.value ? t('enabled') : t('disabled')}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Quiet hours */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          {t('quietHours')}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{t('quietHoursDesc')}</p>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label
              htmlFor="quiet-start"
              className="text-sm font-medium text-slate-600"
            >
              {t('from')}
            </label>
            <input
              id="quiet-start"
              type="time"
              value={prefs.quiet_hours_start ?? ''}
              onChange={(e) =>
                updateField(
                  'quiet_hours_start',
                  e.target.value || null,
                )
              }
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm shadow-sm focus:border-[var(--ev-green)] focus:ring-[var(--ev-green)]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="quiet-end"
              className="text-sm font-medium text-slate-600"
            >
              {t('to')}
            </label>
            <input
              id="quiet-end"
              type="time"
              value={prefs.quiet_hours_end ?? ''}
              onChange={(e) =>
                updateField(
                  'quiet_hours_end',
                  e.target.value || null,
                )
              }
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm shadow-sm focus:border-[var(--ev-green)] focus:ring-[var(--ev-green)]"
            />
          </div>
        </div>
      </section>

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="w-full rounded-lg bg-[var(--ev-blue)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--ev-blue-light)] disabled:opacity-50"
      >
        {isPending ? '...' : t('save')}
      </button>
    </div>
  );
}
