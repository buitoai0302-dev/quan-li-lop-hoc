import React, { useEffect } from 'react';
import { Mail, Calendar, Phone, PhoneCall } from 'lucide-react';
import type { TFunction } from 'i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { StudentFormProps } from '../types';
import type { StudentFormData } from '@/types/schemas';
import { Input, Select, Label } from '@/components/common/UI';

const FIELD_LABEL_CLASS =
  'mb-1.5 text-sm font-semibold normal-case tracking-normal text-slate-700 dark:text-slate-200';

// 1. Zod Schema
const getStudentSchema = (t: TFunction) =>
  z.object({
    full_name: z.string().min(2, { message: t('validation.nameMin') }),
    email: z.string().email({ message: t('validation.emailInvalid') }),
    phone: z.string().optional(),
    date_of_birth: z.string().optional(),
    branch_id: z.string().min(1, { message: t('validation.branchRequired') }),
    is_active: z.boolean(),
    parent_phone: z.string().optional(),
  });

const StudentForm: React.FC<StudentFormProps> = ({
  id,
  initialData,
  onSubmit,
  branches,
  editingId,
  t,
  dobInputRef,
}) => {
  // 2. React Hook Form setup
  const schema = getStudentSchema(t);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(schema),
    defaultValues: initialData || {
      full_name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      branch_id: branches.length > 0 ? branches[0].id : '',
      is_active: true,
      parent_phone: '',
    },
  });

  // Sync initialData if it changes (e.g. when opening modal for different student)
  useEffect(() => {
    if (initialData) {
      reset(initialData);
    } else {
      reset({
        full_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        branch_id: branches.length > 0 ? branches[0].id : '',
        is_active: true,
        parent_phone: '',
      });
    }
  }, [initialData, reset, branches]);

  const { ref: dobRef, ...dobRegisterRest } = register('date_of_birth');
  const fieldId = (name: keyof StudentFormData) => `${id}-${name}`;
  const errorId = (name: keyof StudentFormData) => `${fieldId(name)}-error`;

  const handleShowPicker = () => {
    const input = dobInputRef?.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (input) {
      if ('showPicker' in input && input.showPicker) input.showPicker();
      else input.click();
    }
  };

  return (
    <form id={id} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <Label htmlFor={fieldId('full_name')} required className={FIELD_LABEL_CLASS}>
            {t('students.name')}
          </Label>
          <Input
            id={fieldId('full_name')}
            aria-required="true"
            aria-invalid={!!errors.full_name}
            aria-describedby={errors.full_name ? errorId('full_name') : undefined}
            autoComplete="name"
            variant="muted"
            placeholder={t('students.namePlaceholder')}
            className={errors.full_name ? 'ring-2 ring-red-500' : ''}
            {...register('full_name')}
          />
          {errors.full_name && (
            <p id={errorId('full_name')} className="form-field-error">
              {errors.full_name.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor={fieldId('date_of_birth')} className={FIELD_LABEL_CLASS}>
            {t('students.dob')}
          </Label>
          <Input
            id={fieldId('date_of_birth')}
            type="date"
            variant="muted"
            icon={<Calendar />}
            onClick={handleShowPicker}
            className="cursor-pointer"
            {...dobRegisterRest}
            ref={(e) => {
              dobRef(e);
              if (dobInputRef) {
                (dobInputRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
              }
            }}
          />
        </div>
        <div>
          <Label htmlFor={fieldId('branch_id')} required className={FIELD_LABEL_CLASS}>
            {t('classes.branch')}
          </Label>
          <Select
            id={fieldId('branch_id')}
            aria-required="true"
            aria-invalid={!!errors.branch_id}
            aria-describedby={errors.branch_id ? errorId('branch_id') : undefined}
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
            <p id={errorId('branch_id')} className="form-field-error">
              {errors.branch_id.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-5 rounded-2xl border border-primary/10 bg-primary/5 p-4 sm:p-6">
        <div>
          <Label htmlFor={fieldId('email')} required className={FIELD_LABEL_CLASS}>
            {t('students.email')}
          </Label>
          <Input
            id={fieldId('email')}
            type="email"
            autoComplete="email"
            aria-required="true"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? errorId('email') : undefined}
            variant={editingId ? 'muted' : 'white'}
            disabled={!!editingId}
            placeholder="example@email.com"
            icon={<Mail />}
            className={errors.email ? 'ring-2 ring-red-500' : ''}
            {...register('email')}
          />
          {errors.email && (
            <p id={errorId('email')} className="form-field-error">
              {errors.email.message}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor={fieldId('phone')} className={FIELD_LABEL_CLASS}>
              {t('students.phone')}
            </Label>
            <Input
              id={fieldId('phone')}
              type="tel"
              variant="white"
              placeholder="09xxx..."
              icon={<Phone size={14} />}
              {...register('phone')}
            />
          </div>
          <div>
            <Label htmlFor={fieldId('parent_phone')} className={FIELD_LABEL_CLASS}>
              {t('students.parentPhone')}
            </Label>
            <Input
              id={fieldId('parent_phone')}
              type="tel"
              variant="white"
              placeholder="09xxx..."
              icon={<PhoneCall size={14} />}
              {...register('parent_phone')}
            />
          </div>
        </div>
      </div>

      {editingId && (
        <div>
          <Label htmlFor={fieldId('is_active')} className={FIELD_LABEL_CLASS}>
            {t('common.status')}
          </Label>
          <Select
            id={fieldId('is_active')}
            variant="muted"
            {...register('is_active', { setValueAs: (v) => v === 'true' || v === true })}
          >
            <option value="true">{t('common.active')}</option>
            <option value="false">{t('common.inactive')}</option>
          </Select>
        </div>
      )}
    </form>
  );
};

export default StudentForm;
