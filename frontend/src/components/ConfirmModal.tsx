import React from 'react';
import Modal from './Modal';
import { AlertTriangle, Info, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<any>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'primary' | 'warning';
  isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmText,
  cancelText,
  type = 'danger',
  isLoading = false
}) => {
  const { t } = useTranslation();

  const getThemeClasses = () => {
    switch (type) {
      case 'primary':
        return {
          icon: <Info className="h-8 w-8 text-blue-600 dark:text-blue-400" />,
          iconBg: 'bg-blue-100 dark:bg-blue-900/30',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 dark:shadow-blue-900/40',
        };
      case 'warning':
        return {
          icon: <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />,
          iconBg: 'bg-amber-100 dark:bg-amber-900/30',
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20 dark:shadow-amber-900/40',
        };
      default:
        return {
          icon: <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />,
          iconBg: 'bg-red-100 dark:bg-red-900/30',
          confirmBtn: 'bg-red-600 hover:bg-red-700 shadow-red-500/20 dark:shadow-red-900/40',
        };
    }
  };

  const theme = getThemeClasses();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col items-center text-center p-2">
        <div className={`w-16 h-16 rounded-full ${theme.iconBg} flex items-center justify-center mb-5 shadow-inner`}>
          {theme.icon}
        </div>
        <p className="text-gray-700 dark:text-gray-300 mb-8 text-base whitespace-pre-line leading-relaxed font-medium">
          {message}
        </p>
        
        <div className="flex w-full space-x-3">
          <button
            type="button"
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-bold text-xs uppercase tracking-widest disabled:opacity-50"
            onClick={onClose}
          >
            {cancelText || t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-all font-bold text-xs uppercase tracking-widest shadow-md disabled:opacity-50 flex items-center justify-center gap-2 ${theme.confirmBtn}`}
            onClick={() => {
              onConfirm();
              if (!isLoading) onClose();
            }}
          >
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            {confirmText || (type === 'danger' ? t('common.delete') : t('common.confirm'))}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
