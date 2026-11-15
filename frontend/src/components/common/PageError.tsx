import { AlertCircle, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './UI';

interface PageErrorProps {
  onRetry: () => unknown;
  retrying?: boolean;
}

export default function PageError({ onRetry, retrying = false }: PageErrorProps) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="m-auto flex max-w-md flex-col items-center gap-3 text-center">
        <AlertCircle aria-hidden="true" size={32} className="text-amber-700 dark:text-amber-300" />
        <div role="alert">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('common.loadErrorTitle')}
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {t('common.loadErrorDescription')}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => void onRetry()}
          loading={retrying}
          icon={<RotateCcw aria-hidden="true" size={16} />}
        >
          {t('common.retry')}
        </Button>
      </div>
    </div>
  );
}
