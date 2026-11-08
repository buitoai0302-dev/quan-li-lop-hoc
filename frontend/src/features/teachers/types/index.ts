import type { TFunction } from 'i18next';
import type { Teacher, TeacherFormData, Branch } from '@/types/schemas';
import type { BaseTableProps } from '@/types';

export interface TeacherTableProps extends BaseTableProps<Teacher> {
  teachers: Teacher[];
}

export interface TeacherFormProps {
  id: string;
  initialData?: TeacherFormData;
  onSubmit: (data: TeacherFormData) => void;
  branches: Branch[];
  editingId: string | null;
  t: TFunction;
}
