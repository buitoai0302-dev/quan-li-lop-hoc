import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  scrollable?: boolean;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  header, 
  footer, 
  scrollable = false 
}) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden flex flex-col ${className}`}>
      {header && (
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/20 shrink-0">
          {header}
        </div>
      )}
      
      <div className={`flex-1 ${scrollable ? 'overflow-y-auto custom-scrollbar' : ''}`}>
        {children}
      </div>

      {footer && (
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/20 shrink-0">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
