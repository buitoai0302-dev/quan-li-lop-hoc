export interface SessionColor {
  bg: string;
  text: string;
  subtext: string;
  border: string;
  accent: string;
  icon: string;
}

export const SESSION_COLORS: SessionColor[] = [
  {
    bg: 'bg-indigo-50 dark:bg-indigo-900/40',
    text: 'text-indigo-900 dark:text-indigo-100',
    subtext: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-500/50',
    accent: 'bg-indigo-100/50 dark:bg-indigo-800',
    icon: 'text-indigo-600 dark:text-indigo-300',
  },
  {
    bg: 'bg-emerald-50 dark:bg-emerald-900/40',
    text: 'text-emerald-900 dark:text-emerald-100',
    subtext: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-500/50',
    accent: 'bg-emerald-100/50 dark:bg-emerald-800',
    icon: 'text-emerald-600 dark:text-emerald-300',
  },
  {
    bg: 'bg-amber-50 dark:bg-amber-900/40',
    text: 'text-amber-900 dark:text-amber-100',
    subtext: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-500/50',
    accent: 'bg-amber-100/50 dark:bg-amber-800',
    icon: 'text-amber-600 dark:text-amber-300',
  },
  {
    bg: 'bg-rose-50 dark:bg-rose-900/40',
    text: 'text-rose-900 dark:text-rose-100',
    subtext: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-500/50',
    accent: 'bg-rose-100/50 dark:bg-rose-800',
    icon: 'text-rose-600 dark:text-rose-300',
  },
  {
    bg: 'bg-violet-50 dark:bg-violet-900/40',
    text: 'text-violet-900 dark:text-violet-100',
    subtext: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-500/50',
    accent: 'bg-violet-100/50 dark:bg-violet-800',
    icon: 'text-violet-600 dark:text-violet-300',
  },
  {
    bg: 'bg-cyan-50 dark:bg-cyan-900/40',
    text: 'text-cyan-900 dark:text-cyan-100',
    subtext: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-500/50',
    accent: 'bg-cyan-100/50 dark:bg-cyan-800',
    icon: 'text-cyan-600 dark:text-cyan-300',
  },
  {
    bg: 'bg-sky-50 dark:bg-sky-900/40',
    text: 'text-sky-900 dark:text-sky-100',
    subtext: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-500/50',
    accent: 'bg-sky-100/50 dark:bg-sky-800',
    icon: 'text-sky-600 dark:text-sky-300',
  },
  {
    bg: 'bg-lime-50 dark:bg-lime-900/40',
    text: 'text-lime-900 dark:text-lime-100',
    subtext: 'text-lime-700 dark:text-lime-300',
    border: 'border-lime-200 dark:border-lime-500/50',
    accent: 'bg-lime-100/50 dark:bg-lime-800',
    icon: 'text-lime-600 dark:text-lime-300',
  },
  {
    bg: 'bg-orange-50 dark:bg-orange-900/40',
    text: 'text-orange-900 dark:text-orange-100',
    subtext: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-500/50',
    accent: 'bg-orange-100/50 dark:bg-orange-800',
    icon: 'text-orange-600 dark:text-orange-300',
  },
  {
    bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/40',
    text: 'text-fuchsia-900 dark:text-fuchsia-100',
    subtext: 'text-fuchsia-700 dark:text-fuchsia-300',
    border: 'border-fuchsia-200 dark:border-fuchsia-500/50',
    accent: 'bg-fuchsia-100/50 dark:bg-fuchsia-800',
    icon: 'text-fuchsia-600 dark:text-fuchsia-300',
  },
  {
    bg: 'bg-teal-50 dark:bg-teal-900/40',
    text: 'text-teal-900 dark:text-teal-100',
    subtext: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-500/50',
    accent: 'bg-teal-100/50 dark:bg-teal-800',
    icon: 'text-teal-600 dark:text-teal-300',
  },
  {
    bg: 'bg-slate-50 dark:bg-slate-900/40',
    text: 'text-slate-900 dark:text-slate-100',
    subtext: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-500/50',
    accent: 'bg-slate-100/50 dark:bg-slate-800',
    icon: 'text-slate-600 dark:text-slate-300',
  },
  // Additional Colors
  {
    bg: 'bg-blue-50 dark:bg-blue-900/40',
    text: 'text-blue-900 dark:text-blue-100',
    subtext: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-500/50',
    accent: 'bg-blue-100/50 dark:bg-blue-800',
    icon: 'text-blue-600 dark:text-blue-300',
  },
  {
    bg: 'bg-pink-50 dark:bg-pink-900/40',
    text: 'text-pink-900 dark:text-pink-100',
    subtext: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-200 dark:border-pink-500/50',
    accent: 'bg-pink-100/50 dark:bg-pink-800',
    icon: 'text-pink-600 dark:text-pink-300',
  },
  {
    bg: 'bg-purple-50 dark:bg-purple-900/40',
    text: 'text-purple-900 dark:text-purple-100',
    subtext: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-500/50',
    accent: 'bg-purple-100/50 dark:bg-purple-800',
    icon: 'text-purple-600 dark:text-purple-300',
  },
  {
    bg: 'bg-red-50 dark:bg-red-900/40',
    text: 'text-red-900 dark:text-red-100',
    subtext: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-500/50',
    accent: 'bg-red-100/50 dark:bg-red-800',
    icon: 'text-red-600 dark:text-red-300',
  },
  {
    bg: 'bg-yellow-50 dark:bg-yellow-900/40',
    text: 'text-yellow-900 dark:text-yellow-100',
    subtext: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-200 dark:border-yellow-500/50',
    accent: 'bg-yellow-100/50 dark:bg-yellow-800',
    icon: 'text-yellow-600 dark:text-yellow-300',
  },
  {
    bg: 'bg-green-50 dark:bg-green-900/40',
    text: 'text-green-900 dark:text-green-100',
    subtext: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-500/50',
    accent: 'bg-green-100/50 dark:bg-green-800',
    icon: 'text-green-600 dark:text-green-300',
  },
  {
    bg: 'bg-zinc-50 dark:bg-zinc-900/40',
    text: 'text-zinc-900 dark:text-zinc-100',
    subtext: 'text-zinc-700 dark:text-zinc-300',
    border: 'border-zinc-200 dark:border-zinc-500/50',
    accent: 'bg-zinc-100/50 dark:bg-zinc-800',
    icon: 'text-zinc-600 dark:text-zinc-300',
  },
  {
    bg: 'bg-stone-50 dark:bg-stone-900/40',
    text: 'text-stone-900 dark:text-stone-100',
    subtext: 'text-stone-700 dark:text-stone-300',
    border: 'border-stone-200 dark:border-stone-500/50',
    accent: 'bg-stone-100/50 dark:bg-stone-800',
    icon: 'text-stone-600 dark:text-stone-300',
  },
];

export const getColorByClassId = (classId: string | undefined): SessionColor => {
  if (!classId) return SESSION_COLORS[0];

  let hash = 0;
  for (let i = 0; i < classId.length; i++) {
    // DJB2 with slightly better mixing
    hash = (hash << 5) - hash + classId.charCodeAt(i);
    hash |= 0; // Convert to 32bit int
  }

  // Use a secondary hash spread to minimize simple collisions
  const spreadHash = Math.abs(hash * 2654435761); // Knuth's multiplicative hash constant
  return SESSION_COLORS[spreadHash % SESSION_COLORS.length];
};
