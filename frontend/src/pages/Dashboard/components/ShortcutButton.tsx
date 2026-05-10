import React from 'react';

interface ShortcutButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: string;
}

const ShortcutButton: React.FC<ShortcutButtonProps> = ({ icon, label, onClick, color }) => {
  const bgLight: Record<string, string> = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600',
    amber: 'bg-amber-50 dark:bg-amber-900/10 text-amber-600',
    rose: 'bg-rose-50 dark:bg-rose-900/10 text-rose-600',
    gray: 'bg-gray-50 dark:bg-gray-900 text-gray-600'
  };
  
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-3 p-4 ${bgLight[color]} rounded-2xl border border-transparent hover:border-current transition-all hover:scale-105 active:scale-95 group shadow-sm`}
    >
      <div className="group-hover:scale-125 transition-transform">{icon}</div>
      <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
    </button>
  );
};

export default ShortcutButton;
