import React from 'react';

interface FilterSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string | number; label: string }[];
  placeholder?: string;
}

const FilterSelect: React.FC<FilterSelectProps> = ({ 
  options, 
  placeholder, 
  className = "", 
  ...props 
}) => {
  return (
    <select
      className={`w-full sm:w-auto border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs font-bold text-gray-600 dark:text-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white dark:bg-gray-800 transition-all appearance-none pr-8 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236B7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_10px_center] bg-no-repeat ${className}`}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};

export default FilterSelect;
