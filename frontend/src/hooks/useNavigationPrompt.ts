import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * Hook to prevent navigation and page reload when there are unsaved changes.
 * 
 * @param isDirty - Boolean indicating if there are unsaved changes
 * @returns blocker - The blocker object from react-router-dom to handle internal navigation
 */
export const useNavigationPrompt = (isDirty: boolean) => {
  const { t } = useTranslation();

  // 1. Handle browser reload/close (Native prompt)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        const message = t('attendance.unsavedDesc', 'You have unsaved changes. Are you sure you want to leave?');
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    if (isDirty) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.onbeforeunload = handleBeforeUnload;
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.onbeforeunload = null;
    };
  }, [isDirty, t]);

  // 2. Handle internal navigation (React Router blocker)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  return blocker;
};
