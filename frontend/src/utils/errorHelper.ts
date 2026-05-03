import toast from 'react-hot-toast';
import type { TFunction } from 'i18next';

export const handleApiError = (error: any, t: TFunction, defaultMessageKey: string = 'common.error') => {
  const data = error.response?.data;
  const errorCode = data?.code;
  
  if (errorCode && errorCode !== 'INTERNAL_ERROR') {
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
