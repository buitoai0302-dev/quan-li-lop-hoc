import React from 'react';

interface UsageBarProps {
  label: string;
  used: number;
  limit: number;
}

const UsageBar: React.FC<UsageBarProps> = ({ label, used, limit }) => {
  const percent = limit === -1 ? 0 : Math.min(Math.round((used / limit) * 100), 100);
  const displayLimit = limit === -1 ? '∞' : limit;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
        <span className="text-gray-400 dark:text-gray-500">{label}</span>
        <span className="text-gray-900 dark:text-white">
          {used} / {displayLimit}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.4)]"
          style={{ width: `${limit === -1 ? 100 : percent}%` }}
        ></div>
      </div>
    </div>
  );
};

export default UsageBar;
