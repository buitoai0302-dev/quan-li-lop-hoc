import type { TFunction } from 'i18next';
import type { Session, Branch, Teacher, ClassData } from '@/types/schemas';
import type { User } from '@/types';

export interface WeeklyScheduleData {
  weekStart: string;
  weekEnd: string;
  sessions: Session[];
}

export type ViewMode = 'day' | 'week' | 'month';

export interface ScheduleHeaderProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  branches: Branch[];
  selectedBranch: string;
  setSelectedBranch: (id: string) => void;
  teachers: Teacher[];
  selectedTeacher: string;
  setSelectedTeacher: (id: string) => void;
  classes: ClassData[];
  selectedClass: string;
  setSelectedClass: (id: string) => void;
  isFilterVisible: boolean;
  setIsFilterVisible: (visible: boolean) => void;
  canEdit: boolean;
  onAddSession: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  currentLocale: unknown;
  user: User | null;
  t: TFunction;
}
