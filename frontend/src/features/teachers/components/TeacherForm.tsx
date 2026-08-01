import React, { useEffect } from 'react';
import { Mail, Briefcase, Phone } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { TeacherFormProps } from '../types';
import type { TFunction } from 'i18next';
import { Input, Select, Label, Button } from '@/components/common/UI';

const getTeacherSchema = (t: TFunction) =>
  z.object({
    full_name: z.string().min(2, { message: t('validation.nameMin') }),
    email: z.string().email({ message: t('validation.emailInvalid') }),
    phone: z.string().optional(),
    specialization: z.string().optional(),
    branch_id: z.string().min(1, { message: t('validation.branchRequired') }),
    is_active: z.boolean(),
  });

type TeacherSchemaType = z.infer<ReturnType<typeof getTeacherSchema>>;

const TeacherForm: React.FC<TeacherFormProps> = ({
  initialData,
  onSubmit,
  branches,
  editingId,
  isSubmitting,
  onClose,
  t,
}) => {
  const schema = getTeacherSchema(t);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TeacherSchemaType>({
    resolver: zodResolver(schema),
    defaultValues: initialData || {
      full_name: '',
      email: '',
      phone: '',
      specialization: '',
      branch_id: branches.length > 0 ? branches[0].id : '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    } else {
      reset({
        full_name: '',
        email: '',
        phone: '',
        specialization: '',
        branch_id: branches.length > 0 ? branches[0].id : '',
        is_active: true,
      });
    }
  }, [initialData, reset, branches]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <Label required ml-1>
            {t('teachers.name')}
          </Label>
          <Input
            variant="muted"
            placeholder={t('teachers.namePlaceholder')}
            className={errors.full_name ? 'ring-2 ring-red-500' : ''}
            {...register('full_name')}
          />
          {errors.full_name && (
            <p className="text-red-500 text-[10px] mt-1.5 ml-1 font-bold">
              {errors.full_name.message}
            </p>
          )}
        </div>
        <div>
          <Label ml-1>{t('teachers.phone')}</Label>
          <Input variant="muted" placeholder="09xxx..." icon={<Phone />} {...register('phone')} />
        </div>
        <div>
          <Label required ml-1>
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
      </div>

      <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 space-y-5">
        <div>
          <Label required ml-1>
            {t('teachers.email')}
          </Label>
          <Input
            type="email"
            variant={editingId ? 'muted' : 'white'}
            disabled={!!editingId}
            placeholder="teacher@example.com"
            icon={<Mail />}
            className={errors.email ? 'ring-2 ring-red-500' : ''}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-red-500 text-[10px] mt-1.5 ml-1 font-bold">{errors.email.message}</p>
          )}
        </div>
        <div>
          <Label ml-1>{t('teachers.specialization')}</Label>
          <Input
            variant="white"
            placeholder={t('teachers.specPlaceholder')}
            icon={<Briefcase />}
            {...register('specialization')}
          />
        </div>
      </div>

      <div>
        <Label ml-1>{t('common.status')}</Label>
        <Select
          variant="muted"
          {...register('is_active', { setValueAs: (v) => v === 'true' || v === true })}
        >
          <option value="true">{t('common.active')}</option>
          <option value="false">{t('common.inactive')}</option>
        </Select>
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

export default TeacherForm;
