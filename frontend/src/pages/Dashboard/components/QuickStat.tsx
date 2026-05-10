import React from 'react';

interface QuickStatProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  trend: string;
  color: string;
}

const QuickStat: React.FC<QuickStatProps> = ({ icon, label, value, trend, color }) => {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500'
  };
  const bgLight: Record<string, string> = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900/10',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/10',
    amber: 'bg-amber-50 dark:bg-amber-900/10'
  };
  const textCol: Record<string, string> = {
    indigo: 'text-indigo-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600'
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/20 dark:shadow-none hover:shadow-2xl transition-all group">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-lg text-white ${colors[color]} shadow-md group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${bgLight[color]} ${textCol[color]}`}>
          {trend}
        </div>
      </div>
      <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">{value}</div>
      <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">{label}</div>
    </div>
  );
};

export default QuickStat;
