import React, { useEffect } from 'react';
import { MapPin, Phone } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { BranchFormProps } from '../types';
import { Input, Select, Label } from '@/components/common/UI';

const getBranchSchema = (t: any) =>
  z.object({
    name: z.string().min(2, { message: t('validation.nameMin') }),
    address: z.string().optional(),
    phone: z.string().optional(),
    is_active: z.boolean(),
  });

type BranchSchemaType = z.infer<ReturnType<typeof getBranchSchema>>;

const BranchForm: React.FC<BranchFormProps> = ({ id, initialData, onSubmit, t }) => {
  const fieldPrefix = React.useId();
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
    <form id={id} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <div>
        <Label htmlFor={fieldPrefix + '-name'} required className="ml-1">
          {t('branches.name')}
        </Label>
        <Input
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? fieldPrefix + '-name-error' : undefined}
          id={fieldPrefix + '-name'}
          aria-required="true"
          variant="muted"
          placeholder={t('branches.namePlaceholder')}
          className={errors.name ? 'ring-2 ring-red-500' : ''}
          {...register('name')}
        />
        {errors.name && (
          <p id={fieldPrefix + '-name-error'} className="form-field-error">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor={fieldPrefix + '-address'} className="ml-1">
            {t('branches.address')}
          </Label>
          <Input
            id={fieldPrefix + '-address'}
            variant="white"
            placeholder={t('branches.addressPlaceholder')}
            icon={<MapPin />}
            {...register('address')}
          />
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor={fieldPrefix + '-phone'} className="ml-1">
              {t('branches.phone')}
            </Label>
            <Input
              id={fieldPrefix + '-phone'}
              variant="white"
              placeholder="024xxx..."
              icon={<Phone />}
              {...register('phone')}
            />
          </div>
          <div className="space-y-1.5">
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

export default BranchForm;
