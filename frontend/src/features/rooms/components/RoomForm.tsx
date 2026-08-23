import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { RoomFormProps } from '../types';
import { ROOM_TYPES } from '@/utils/constants';
import { Input, Select, Label, Button } from '@/components/common/UI';

const getRoomSchema = (t: any) =>
  z.object({
    name: z.string().min(1, { message: t('validation.roomNameRequired') }),
    branch_id: z.string().min(1, { message: t('validation.branchRequired') }),
    room_type: z.string(),
    capacity: z.number().min(1, { message: t('validation.capacityMin') }),
    is_active: z.boolean(),
  });

type RoomSchemaType = z.infer<ReturnType<typeof getRoomSchema>>;

const RoomForm: React.FC<RoomFormProps> = ({
  initialData,
  onSubmit,
  branches,
  isSubmitting,
  onClose,
  t,
}) => {
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <Label required className="ml-1">
            {t('rooms.name')}
          </Label>
          <Input
            variant="muted"
            placeholder={t('rooms.namePlaceholder')}
            className={errors.name ? 'ring-2 ring-red-500' : ''}
            {...register('name')}
          />
          {errors.name && (
            <p className="text-red-500 text-[10px] mt-1.5 ml-1 font-bold">{errors.name.message}</p>
          )}
        </div>
        <div>
          <Label required className="ml-1">
            {t('classes.branch')}
          </Label>
          <Select
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
            <p className="text-red-500 text-[10px] mt-1.5 ml-1 font-bold">
              {errors.branch_id.message}
            </p>
          )}
        </div>
        <div>
          <Label className="ml-1">{t('rooms.type')}</Label>
          <Select variant="muted" {...register('room_type')}>
            <option value={ROOM_TYPES.CLASSROOM}>{t('rooms.classroom')}</option>
            <option value={ROOM_TYPES.LAB}>{t('rooms.lab')}</option>
            <option value={ROOM_TYPES.MEETING}>{t('rooms.meeting')}</option>
          </Select>
        </div>
      </div>

      <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 space-y-5">
        <div className="grid grid-cols-2 gap-5">
          <div>
            <Label className="ml-1">{t('rooms.capacity')}</Label>
            <Input
              type="number"
              min="1"
              variant="white"
              className={errors.capacity ? 'ring-2 ring-red-500' : ''}
              {...register('capacity', { valueAsNumber: true })}
            />
            {errors.capacity && (
              <p className="text-red-500 text-[10px] mt-1.5 ml-1 font-bold">
                {errors.capacity.message}
              </p>
            )}
          </div>
          <div className="flex flex-col">
            <Label className="ml-1">{t('common.status')}</Label>
            <Select
              variant="white"
              {...register('is_active', { setValueAs: (v) => v === 'true' || v === true })}
            >
              <option value="true">{t('common.active')}</option>
              <option value="false">{t('common.inactive')}</option>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="flex-1 text-[10px] uppercase tracking-widest"
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-[2] text-[10px] uppercase tracking-widest"
        >
          {isSubmitting ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </form>
  );
};

export default RoomForm;
