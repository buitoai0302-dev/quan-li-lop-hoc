import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'max-w-sm' | 'max-w-md' | 'max-w-lg' | 'max-w-xl' | 'max-w-2xl' | 'max-w-3xl' | 'max-w-4xl' | 'max-w-5xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-2 sm:p-4">
      <div 
        className="fixed inset-0 bg-gray-900/70 backdrop-blur-[3px] transition-opacity duration-300" 
        onClick={onClose}
      />
      
      <div 
        ref={modalRef}
        className={`relative bg-white dark:bg-gray-800 rounded-xl sm:rounded-xl shadow-2xl w-full max-w-[calc(100%-2rem)] ${maxWidth} max-h-[90vh] sm:max-h-[calc(100vh-100px)] overflow-hidden transform transition-all border sm:border-0 dark:border-gray-700 flex flex-col mx-auto mb-4 sm:mb-0`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
          <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white truncate pr-4 uppercase tracking-wider">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none bg-white dark:bg-gray-800 p-1.5 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm transition-all active:scale-90"
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="px-5 py-4 sm:py-6 overflow-y-auto custom-scrollbar flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
