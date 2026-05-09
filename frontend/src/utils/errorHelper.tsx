import toast from 'react-hot-toast';
import type { TFunction } from 'i18next';
import { ERROR_CODES } from './constants';

export const handleApiError = (error: any, t: TFunction, defaultMessageKey: string = 'common.error') => {
  const data = error.response?.data;
  const errorCode = data?.code || data?.errorCode;
  const errorMessage = data?.message || data?.error || '';
  const status = error.response?.status;
  
  console.log('API Error:', { status, errorCode, errorMessage, data });

  // Detect Limit Exceeded (via code or 403 + message)
  const isLimitExceeded = 
    errorCode === ERROR_CODES.LIMIT_EXCEEDED || 
    (status === 403 && (errorMessage.toLowerCase().includes('limit') || errorMessage.toLowerCase().includes('giới hạn')));

  if (isLimitExceeded) {
    toast(
      (tObj) => (
        <div className="flex flex-col gap-2 min-w-[250px]">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <p className="font-black text-sm text-gray-900 dark:text-white">{t('errors.LIMIT_EXCEEDED_TITLE')}</p>
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

  if (errorCode && errorCode !== ERROR_CODES.INTERNAL_ERROR) {
    // Try to translate the error code
    const translatedMessage = t(`errors.${errorCode}`);
    // If translation exists and is not just the key itself
    if (translatedMessage && translatedMessage !== `errors.${errorCode}`) {
      toast.error(translatedMessage);
      return;
    }
  }

  // Fallback to error message from server or default message
  toast.error(data?.error || data?.message || t(defaultMessageKey));
};
