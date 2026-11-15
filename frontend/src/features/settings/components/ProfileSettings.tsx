import { useId } from 'react';
import type { ProfileSettingsProps } from '@/features/auth';
import { Button, Input, Label } from '@/components/common/UI';

export default function ProfileSettings({
  fullName,
  setFullName,
  notifySessions,
  setNotifySessions,
  onSave,
  saving,
  t,
}: ProfileSettingsProps) {
  const fieldId = useId();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
      className="space-y-6"
    >
      <div className="border-b border-slate-200 pb-4 dark:border-slate-700">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          {t('settings.personalSettings')}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {t('settings.personalSettingsDesc')}
        </p>
      </div>
      <fieldset disabled={saving} className="grid gap-5">
        <div className="space-y-2">
          <Label htmlFor={`${fieldId}-name`}>{t('settings.displayName')}</Label>
          <Input
            id={`${fieldId}-name`}
            name="full_name"
            autoComplete="name"
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="text-base sm:text-sm"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <div className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900 dark:text-white">
              {t('settings.notifications')}
            </span>
            <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">
              {t('settings.notificationDesc')}
            </span>
          </div>
          <input
            type="checkbox"
            name="notify_upcoming_sessions"
            checked={notifySessions}
            onChange={(event) => setNotifySessions(event.target.checked)}
            className="size-5 shrink-0 rounded accent-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          />
        </label>
      </fieldset>
      <Button type="submit" loading={saving} className="w-full sm:w-auto">
        {t('common.save')}
      </Button>
    </form>
  );
}
