import toast from 'react-hot-toast';
import type { TFunction } from 'i18next';
import { AxiosError } from 'axios';
import { ERROR_CODES } from './constants';

export interface ApiErrorData {
  code?: string;
  errorCode?: string;
  message?: string;
  error?: string;
  params?: Record<string, string | number>;
  slot?: { index?: number; date: string; startTime: string; endTime: string };
  conflicts?: Array<{
    conflict_type: string;
    conflict_id?: string;
    detail?: string;
  }>;
}

const readErrorCode = (data?: ApiErrorData) =>
  data?.code ||
  data?.errorCode ||
  (data?.error === ERROR_CODES.SCHEDULE_CONFLICT ? data.error : undefined);

export const getApiErrorMessage = (
  error: AxiosError<ApiErrorData>,
  t: TFunction,
  defaultMessageKey: string = 'common.error'
): string => {
  const data = error.response?.data;
  const code = readErrorCode(data);
  if (error.response?.status === 429 && (!code || code === ERROR_CODES.INTERNAL_ERROR)) {
    return t('errors.TOO_MANY_REQUESTS');
  }
  if (code) {
    const key = `errors.${code}`;
    const translated = t(key, data?.params || {});
    if (translated && translated !== key) return translated;
    if (code === ERROR_CODES.INTERNAL_ERROR) return t('errors.INTERNAL_ERROR');
  }
  if (error.response?.status === 429) return t('errors.TOO_MANY_REQUESTS');
  return data?.message || data?.error || t(defaultMessageKey);
};

export const handleApiError = (
  error: AxiosError<ApiErrorData>,
  t: TFunction,
  defaultMessageKey: string = 'common.error'
) => {
  const data = error.response?.data;
  const errorCode = readErrorCode(data);
  const errorMessage = data?.message || data?.error || '';
  const status = error.response?.status;

  console.error('[API Error]', { status, errorCode, errorMessage, data });

  // Detect Limit Exceeded (via code or 403 + message)
  const isLimitExceeded =
    errorCode === ERROR_CODES.LIMIT_EXCEEDED ||
    (status === 403 &&
      (errorMessage.toLowerCase().includes('limit') ||
        errorMessage.toLowerCase().includes('giới hạn')));

  if (isLimitExceeded) {
    toast(
      (tObj) => (
        <div className="flex flex-col gap-2 min-w-[250px]">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <p className="font-black text-sm text-gray-900 dark:text-white">
              {t('errors.LIMIT_EXCEEDED_TITLE')}
            </p>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            {t('errors.LIMIT_EXCEEDED_DESC')}
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                window.location.href = '/subscription';
                toast.dismiss(tObj.id);
              }}
              className="flex-1 bg-primary text-white px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
            >
              {t('common.upgradeNow')}
            </button>
            <button
              onClick={() => toast.dismiss(tObj.id)}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      ),
      { duration: 6000, position: 'top-center' }
    );
    return;
  }

  // Handle Schedule Conflicts
  if (errorCode === ERROR_CODES.SCHEDULE_CONFLICT) {
    if (data?.conflicts && Array.isArray(data.conflicts) && data.conflicts.length > 0) {
      // Group conflicts by type for cleaner messages
      const conflictMessages = data.conflicts.map((c) => {
        const typeKey = `errors.${c.conflict_type}`;
        const translatedType = t(typeKey);
        // If translation doesn't exist, use the detail from server (fallback)
        const message =
          translatedType !== typeKey ? translatedType : c.detail || t('errors.SCHEDULE_CONFLICT');
        return data.slot
          ? t('errors.SCHEDULE_CONFLICT_AT', {
              message,
              date: data.slot.date,
              startTime: data.slot.startTime.slice(0, 5),
              endTime: data.slot.endTime.slice(0, 5),
            })
          : message;
      });

      // Show unique messages
      Array.from(new Set(conflictMessages)).forEach((msg) => {
        toast.error(msg, { duration: 5000 });
      });
      return;
    }
  }

  toast.error(getApiErrorMessage(error, t, defaultMessageKey));
};
