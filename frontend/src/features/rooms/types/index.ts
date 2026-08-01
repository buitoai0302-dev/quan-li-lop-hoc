import type { TFunction } from 'i18next';
import type { Room, RoomFormData, Branch } from '@/types/schemas';
import type { BaseTableProps } from '@/types';

export interface RoomTableProps extends BaseTableProps<Room> {
  rooms: Room[];
}

export interface RoomFormProps {
  initialData?: RoomFormData;
  onSubmit: (data: RoomFormData) => void;
  branches: Branch[];
  isSubmitting: boolean;
  onClose: () => void;
  t: TFunction;
}
