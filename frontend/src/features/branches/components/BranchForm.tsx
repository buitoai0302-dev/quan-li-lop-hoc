import React, { useEffect } from 'react';
import { MapPin, Phone } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { BranchFormProps } from '../types';
import { Input, Select, Label, Button } from '@/components/common/UI';

const getBranchSchema = (t: unknown) =>
  z.object({
    name: z.string().min(2, { message: t('validation.nameMin') }),
    address: z.string().optional(),
    phone: z.string().optional(),
    is_active: z.boolean(),
  });

type BranchSchemaType = z.infer<ReturnType<typeof getBranchSchema>>;

const BranchForm: React.FC<BranchFormProps> = ({
  initialData,
  onSubmit,
  isSubmitting,
  onClose,
  t,
}) => {
  const schema = getBranchSchema(t);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BranchSchemaType>({
    resolver: zodResolver(schema),
    defaultValues: initialData || { name: '', address: '', phone: '', is_active: true },
  });

  useEffect(() => {
    reset(initialData || { name: '', address: '', phone: '', is_active: true });
  }, [initialData, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Label required ml-1>
          {t('branches.name')}
        </Label>
        <Input
          variant="muted"
          placeholder={t('branches.namePlaceholder')}
          className={errors.name ? 'ring-2 ring-red-500' : ''}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-red-500 text-[10px] mt-1.5 ml-1 font-bold">{errors.name.message}</p>
        )}
      </div>

      <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 space-y-5">
        <div className="space-y-1.5">
          <Label ml-1>{t('branches.address')}</Label>
          <Input
            variant="white"
            placeholder={t('branches.addressPlaceholder')}
            icon={<MapPin />}
            {...register('address')}
          />
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label ml-1>{t('branches.phone')}</Label>
            <Input
              variant="white"
              placeholder="024xxx..."
              icon={<Phone />}
              {...register('phone')}
            />
          </div>
          <div className="space-y-1.5">
            <Label ml-1>{t('common.status')}</Label>
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

export default BranchForm;
