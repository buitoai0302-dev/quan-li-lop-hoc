import { useId, type FormEvent } from 'react';
import type { TFunction } from 'i18next';
import { Button, Input, Label } from '@/components/common/UI';

interface GeneralSettingsProps {
  centerName: string;
  setCenterName: (name: string) => void;
  contactEmail: string;
  setContactEmail: (email: string) => void;
  onSave: (event: FormEvent) => void;
  saving: boolean;
  t: TFunction;
}

export default function GeneralSettings({
  centerName,
  setCenterName,
  contactEmail,
  setContactEmail,
  onSave,
  saving,
  t,
}: GeneralSettingsProps) {
  const fieldId = useId();
  return (
    <form onSubmit={onSave} className="space-y-6">
      <div className="border-b border-slate-200 pb-4 dark:border-slate-700">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          {t('settings.basicInfo')}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {t('settings.basicInfoDesc')}
        </p>
      </div>
      <fieldset disabled={saving} className="grid gap-5">
        <div className="space-y-2">
          <Label htmlFor={`${fieldId}-name`}>{t('settings.centerName')}</Label>
          <Input
            id={`${fieldId}-name`}
            name="name"
            autoComplete="organization"
            required
            value={centerName}
            onChange={(event) => setCenterName(event.target.value)}
            className="text-base sm:text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${fieldId}-email`}>{t('settings.contactEmail')}</Label>
          <Input
            id={`${fieldId}-email`}
            name="contact_email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            className="text-base sm:text-sm"
          />
        </div>
      </fieldset>
      <Button type="submit" loading={saving} className="w-full sm:w-auto">
        {t('common.save')}
      </Button>
    </form>
  );
}
