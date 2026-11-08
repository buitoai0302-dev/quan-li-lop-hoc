import type { TFunction } from 'i18next';
import type { Student, StudentFormData, Branch } from '@/types/schemas';
import type { BaseTableProps } from '@/types';

export interface StudentTableProps extends BaseTableProps<Student> {
  students: Student[];
  selectedIds?: string[];
  onSelectAll?: (checked: boolean) => void;
  onSelectOne?: (id: string, checked: boolean) => void;
}

export interface StudentFormProps {
  id: string;
  initialData?: StudentFormData;
  onSubmit: (data: StudentFormData) => void;
  branches: Branch[];
  editingId: string | null;
  t: TFunction;
  dobInputRef: React.RefObject<HTMLInputElement | null>;
}
