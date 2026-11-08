import type { TFunction } from 'i18next';
import type { Branch, BranchFormData } from '@/types/schemas';
import type { BaseTableProps } from '@/types';

export interface BranchTableProps extends BaseTableProps<Branch> {
  branches: Branch[];
}

export interface BranchFormProps {
  id: string;
  initialData?: BranchFormData;
  onSubmit: (data: BranchFormData) => void;
  t: TFunction;
}
