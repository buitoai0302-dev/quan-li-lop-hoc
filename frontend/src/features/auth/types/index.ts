import type { TFunction } from 'i18next';

export interface ProfileSettingsProps {
  fullName: string;
  setFullName: (name: string) => void;
  notifySessions: boolean;
  setNotifySessions: (notify: boolean) => void;
  onSave: () => void;
  saving: boolean;
  t: TFunction;
}
