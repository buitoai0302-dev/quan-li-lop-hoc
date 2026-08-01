import type { TFunction } from 'i18next';
import type { ClassData, ClassBasicFormData, Branch, Teacher, Room, Student, RecurringSchedule, Enrollment } from '@/types/schemas';
import type { BaseTableProps } from '@/types';

export interface BulkEnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  allStudents: Student[];
  enrollments: Enrollment[];
  onBulkEnroll: (studentIds: string[]) => void;
  t: TFunction;
}

export interface ClassTableProps extends BaseTableProps<ClassData> {
  classes: ClassData[];
}

export interface ClassFormProps {
  initialData?: ClassBasicFormData;
  onSubmit: (data: ClassBasicFormData) => void;
  branches: Branch[];
  teachers: Teacher[];
  rooms: Room[];
  allStudents: Student[];
  recurringSchedules: RecurringSchedule[];
  setRecurringSchedules: (schedules: RecurringSchedule[]) => void;
  enrollments: Enrollment[];
  selectedStudentId: string;
  setSelectedStudentId: (id: string) => void;
  onEnrollStudent: () => void;
  onUnenrollStudent: (studentId: string) => void;
  onOpenBulkEnroll: () => void;
  onClose: () => void;
  isSubmitting: boolean;
  t: TFunction;
  startDateRef: React.RefObject<HTMLInputElement | null>;
  endDateRef: React.RefObject<HTMLInputElement | null>;
}
