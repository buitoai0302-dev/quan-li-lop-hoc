import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: 'max-w-4xl' | 'max-w-5xl' | 'max-w-6xl' | 'max-w-7xl' | 'max-w-full';
  className?: string;
  scrollable?: boolean;
}

const PageContainer: React.FC<PageContainerProps> = ({ 
  children, 
  maxWidth = 'max-w-7xl', 
  className = '', 
  scrollable = true 
}) => {
  return (
    <div className={`h-full flex flex-col overflow-hidden ${className}`}>
      <div className={`flex-1 w-full mx-auto ${maxWidth} flex flex-col overflow-hidden`}>
        <div className={`flex-1 ${scrollable ? 'overflow-auto custom-scrollbar' : 'overflow-hidden'} flex flex-col p-1`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageContainer;
