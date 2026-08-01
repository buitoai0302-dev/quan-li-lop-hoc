import React, { useEffect } from 'react';
import { Mail, Calendar, Phone, PhoneCall } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { StudentFormProps } from '../types';
import type { StudentFormData } from '@/types/schemas';
import { Input, Select, Label, Button } from '@/components/common/UI';

// 1. Zod Schema
const getStudentSchema = (t: any) =>
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
  initialData,
  onSubmit,
  branches,
  editingId,
  isSubmitting,
  onClose,
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

  const handleShowPicker = () => {
    const input = dobInputRef?.current as any;
    if (input) {
      if ('showPicker' in input) input.showPicker();
      else input.click();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <Label required ml-1>
            {t('students.name')}
          </Label>
          <Input
            variant="muted"
            placeholder={t('students.namePlaceholder')}
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
          <Label ml-1>{t('students.dob')}</Label>
          <Input
            type="date"
            variant="muted"
            icon={<Calendar />}
            onClick={handleShowPicker}
            className="cursor-pointer"
            {...dobRegisterRest}
            ref={(e) => {
              dobRef(e);
              if (dobInputRef) (dobInputRef as any).current = e;
            }}
          />
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
            {t('students.email')}
          </Label>
          <Input
            type="email"
            variant={editingId ? 'muted' : 'white'}
            disabled={!!editingId}
            placeholder="example@email.com"
            icon={<Mail />}
            className={errors.email ? 'ring-2 ring-red-500' : ''}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-red-500 text-[10px] mt-1.5 ml-1 font-bold">{errors.email.message}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <Label ml-1>{t('students.phone')}</Label>
            <Input
              variant="white"
              placeholder="09xxx..."
              icon={<Phone size={14} />}
              {...register('phone')}
            />
          </div>
          <div>
            <Label ml-1>{t('students.parentPhone')}</Label>
            <Input
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
          <Label ml-1>{t('common.status')}</Label>
          <Select
            variant="muted"
            {...register('is_active', { setValueAs: (v) => v === 'true' || v === true })}
          >
            <option value="true">{t('common.active')}</option>
            <option value="false">{t('common.inactive')}</option>
          </Select>
        </div>
      )}

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

export default StudentForm;
