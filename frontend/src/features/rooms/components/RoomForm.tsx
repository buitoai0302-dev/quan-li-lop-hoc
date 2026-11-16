import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { RoomFormProps } from '../types';
import { ROOM_TYPES } from '@/utils/constants';
import { Input, Select, Label } from '@/components/common/UI';

const getRoomSchema = (t: any) =>
  z.object({
    name: z.string().min(1, { message: t('validation.roomNameRequired') }),
    branch_id: z.string().min(1, { message: t('validation.branchRequired') }),
    room_type: z.string(),
    capacity: z.number().min(1, { message: t('validation.capacityMin') }),
    is_active: z.boolean(),
  });

type RoomSchemaType = z.infer<ReturnType<typeof getRoomSchema>>;

const RoomForm: React.FC<RoomFormProps> = ({ id, initialData, onSubmit, branches, t }) => {
  const fieldPrefix = React.useId();
  const schema = getRoomSchema(t);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoomSchemaType>({
    resolver: zodResolver(schema),
    defaultValues: initialData || {
      name: '',
      capacity: 30,
      room_type: ROOM_TYPES.CLASSROOM,
      branch_id: branches.length > 0 ? branches[0].id : '',
      is_active: true,
    },
  });

  useEffect(() => {
    reset(
      initialData || {
        name: '',
        capacity: 30,
        room_type: ROOM_TYPES.CLASSROOM,
        branch_id: branches.length > 0 ? branches[0].id : '',
        is_active: true,
      }
    );
  }, [initialData, reset, branches]);

  return (
    <form id={id} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <Label htmlFor={fieldPrefix + '-name'} required className="ml-1">
            {t('rooms.name')}
          </Label>
          <Input
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? fieldPrefix + '-name-error' : undefined}
            id={fieldPrefix + '-name'}
            aria-required="true"
            variant="muted"
            placeholder={t('rooms.namePlaceholder')}
            className={errors.name ? 'ring-2 ring-red-500' : ''}
            {...register('name')}
          />
          {errors.name && (
            <p id={fieldPrefix + '-name-error'} className="form-field-error">
              {errors.name.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor={fieldPrefix + '-branch_id'} required className="ml-1">
            {t('classes.branch')}
          </Label>
          <Select
            aria-invalid={!!errors.branch_id}
            aria-describedby={errors.branch_id ? fieldPrefix + '-branch_id-error' : undefined}
            id={fieldPrefix + '-branch_id'}
            aria-required="true"
            variant="muted"
            className={errors.branch_id ? 'ring-2 ring-red-500' : ''}
            {...register('branch_id')}
          >
            <option value="" disabled>
              ---
            </option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </Select>
          {errors.branch_id && (
            <p id={fieldPrefix + '-branch_id-error'} className="form-field-error">
              {errors.branch_id.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor={fieldPrefix + '-room_type'} className="ml-1">
            {t('rooms.type')}
          </Label>
          <Select id={fieldPrefix + '-room_type'} variant="muted" {...register('room_type')}>
            <option value={ROOM_TYPES.CLASSROOM}>{t('rooms.classroom')}</option>
            <option value={ROOM_TYPES.LAB}>{t('rooms.lab')}</option>
            <option value={ROOM_TYPES.MEETING}>{t('rooms.meeting')}</option>
          </Select>
        </div>
      </div>

      <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 space-y-5">
        <div className="grid grid-cols-2 gap-5">
          <div>
            <Label htmlFor={fieldPrefix + '-capacity'} className="ml-1">
              {t('rooms.capacity')}
            </Label>
            <Input
              aria-invalid={!!errors.capacity}
              aria-describedby={errors.capacity ? fieldPrefix + '-capacity-error' : undefined}
              id={fieldPrefix + '-capacity'}
              type="number"
              min="1"
              variant="white"
              className={errors.capacity ? 'ring-2 ring-red-500' : ''}
              {...register('capacity', { valueAsNumber: true })}
            />
            {errors.capacity && (
              <p id={fieldPrefix + '-capacity-error'} className="form-field-error">
                {errors.capacity.message}
              </p>
            )}
          </div>
          <div className="flex flex-col">
            <Label htmlFor={fieldPrefix + '-is_active'} className="ml-1">
              {t('common.status')}
            </Label>
            <Select
              id={fieldPrefix + '-is_active'}
              variant="white"
              {...register('is_active', { setValueAs: (v) => v === 'true' || v === true })}
            >
              <option value="true">{t('common.active')}</option>
              <option value="false">{t('common.inactive')}</option>
            </Select>
          </div>
        </div>
      </div>
    </form>
  );
};

export default RoomForm;
