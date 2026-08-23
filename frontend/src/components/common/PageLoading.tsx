import React from 'react';
import { BookOpen } from 'lucide-react';

const PageLoading: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] animate-in fade-in duration-500">
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary shadow-lg"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <BookOpen size={24} className="text-primary animate-pulse" />
        </div>
      </div>
      <p className="mt-6 text-sm font-black text-gray-400 uppercase tracking-[0.2em] animate-pulse">
        Loading...
      </p>
    </div>
  );
};

export default PageLoading;
