import { useTranslation } from 'react-i18next';

interface ActiveIndicatorProps {
  active: boolean;
}

export default function ActiveIndicator({ active }: ActiveIndicatorProps) {
  const { t } = useTranslation();

  return (
    <span
      role="img"
      aria-label={active ? t('common.active') : t('common.inactive')}
      title={active ? t('common.active') : t('common.inactive')}
      className={`absolute -bottom-1 -right-1 w-3 h-3 border-2 border-white dark:border-slate-900 rounded-full ${active ? 'bg-green-500' : 'bg-red-500'}`}
    />
  );
}
