import React, { useEffect } from 'react';
import { Calendar, Plus, Search, Users, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ClassFormProps } from '../types';
import type { TFunction } from 'i18next';
import { Input, Select, Label, Button, Card, Badge } from '@/components/common/UI';

const getClassSchema = (t: TFunction) =>
  z.object({
    name: z.string().min(1, { message: t('validation.classNameRequired') }),
    branch_id: z.string().min(1, { message: t('validation.branchRequired') }),
    teacher_id: z.string().optional(),
    max_capacity: z.number().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
  });

type ClassBasicSchemaType = z.infer<ReturnType<typeof getClassSchema>>;

const ClassForm: React.FC<ClassFormProps> = ({
  id,
  initialData,
  onSubmit,
  branches,
  teachers,
  rooms,
  allStudents,
  recurringSchedules,
  setRecurringSchedules,
  enrollments,
  selectedStudentId,
  setSelectedStudentId,
  onEnrollStudent,
  onUnenrollStudent,
  onOpenBulkEnroll,
  t,
  startDateRef,
  endDateRef,
}) => {
  const fieldPrefix = React.useId();
  const schema = getClassSchema(t);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClassBasicSchemaType>({
    resolver: zodResolver(schema),
    defaultValues: initialData || {
      name: '',
      branch_id: branches.length > 0 ? branches[0].id : '',
      teacher_id: '',
      max_capacity: 30,
      start_date: '',
      end_date: '',
    },
  });

  useEffect(() => {
    reset(
      initialData || {
        name: '',
        branch_id: branches.length > 0 ? branches[0].id : '',
        teacher_id: '',
        max_capacity: 30,
        start_date: '',
        end_date: '',
      }
    );
  }, [initialData, reset, branches]);

  const { ref: startRef, ...startRegisterRest } = register('start_date');
  const { ref: endRef, ...endRegisterRest } = register('end_date');

  const handleShowPicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    const input = ref.current as HTMLInputElement;
    if (input) {
      if (typeof (input as any).showPicker === 'function') {
        (input as any).showPicker();
      } else {
        input.click();
      }
    }
  };

  return (
    <form
      id={id}
      onSubmit={handleSubmit((data) => {
        onSubmit(data);
      })}
      className="space-y-4 py-1"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Basic Info - Left Column */}
        <div className="min-w-0 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor={fieldPrefix + '-name'} required className="ml-1">
                {t('classes.name')}
              </Label>
              <Input
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? fieldPrefix + '-name-error' : undefined}
                id={fieldPrefix + '-name'}
                aria-required="true"
                variant="muted"
                size="sm"
                placeholder={t('classes.namePlaceholder')}
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
                size="sm"
                className={errors.branch_id ? 'ring-2 ring-red-500' : ''}
                {...register('branch_id')}
              >
                <option value="" disabled>
                  ---
                </option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
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
              <Label htmlFor={fieldPrefix + '-max_capacity'} className="ml-1">
                {t('classes.capacity')}
              </Label>
              <Input
                id={fieldPrefix + '-max_capacity'}
                type="number"
                variant="muted"
                size="sm"
                {...register('max_capacity', { valueAsNumber: true })}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor={fieldPrefix + '-teacher_id'} className="ml-1">
                {t('classes.teacher')}
              </Label>
              <Select
                id={fieldPrefix + '-teacher_id'}
                variant="muted"
                size="sm"
                {...register('teacher_id')}
              >
                <option value="">-- {t('classes.unassigned')} --</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor={fieldPrefix + '-field-5'} className="ml-1">
                {t('classes.startDate')}
              </Label>
              <Input
                id={fieldPrefix + '-field-5'}
                type="date"
                variant="muted"
                size="sm"
                icon={<Calendar />}
                onClick={() => handleShowPicker(startDateRef)}
                className="cursor-pointer"
                {...startRegisterRest}
                /* eslint-disable react-hooks/immutability */
                ref={(e) => {
                  startRef(e);
                  if (startDateRef)
                    (startDateRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
                }}
                /* eslint-enable react-hooks/immutability */
              />
            </div>
            <div>
              <Label htmlFor={fieldPrefix + '-field-6'} className="ml-1">
                {t('classes.endDate')}
              </Label>
              <Input
                id={fieldPrefix + '-field-6'}
                type="date"
                variant="muted"
                size="sm"
                icon={<Calendar />}
                onClick={() => handleShowPicker(endDateRef)}
                className="cursor-pointer"
                {...endRegisterRest}
                /* eslint-disable react-hooks/immutability */
                ref={(e) => {
                  endRef(e);
                  if (endDateRef)
                    (endDateRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
                }}
                /* eslint-enable react-hooks/immutability */
              />
            </div>
          </div>
        </div>

        {/* Recurring Schedule - Right Column */}
        <div className="flex min-w-0 flex-col lg:[contain:size]">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 pb-2 lg:items-start">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t('classes.recurringSchedule')}
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setRecurringSchedules([
                  ...recurringSchedules,
                  { day_of_week: 1, start_time: '08:00', end_time: '10:00', room_id: '' },
                ]);
              }}
              className="min-h-11"
            >
              <Plus size={12} className="mr-1" />
              {t('common.add')}
            </Button>
          </div>

          <Card
            variant="muted"
            scrollable
            className="lg:min-h-0 lg:flex-1"
            bodyClassName="grid max-h-[min(22rem,45dvh)] grid-cols-[repeat(auto-fit,minmax(min(100%,max(15rem,calc((100%_-_0.5rem)/2))),1fr))] content-start gap-2 overscroll-y-contain p-2 lg:max-h-none"
          >
            {recurringSchedules.map((schedule, index) => (
              <div
                key={index}
                className="@container min-w-0 rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {t('classes.recurringSlot', { number: index + 1 })}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label={t('classes.removeRecurringSlot', { number: index + 1 })}
                    onClick={() =>
                      setRecurringSchedules(recurringSchedules.filter((_, i) => i !== index))
                    }
                    className="size-8 shrink-0 text-red-600 pointer-coarse:size-11 dark:text-red-400"
                  >
                    <X aria-hidden="true" size={16} />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-2 @min-[13.5rem]:grid-cols-2">
                  <div className="min-w-0">
                    <label
                      htmlFor={fieldPrefix + '-field-7' + '-' + index}
                      className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      {t('common.day')}
                    </label>
                    <Select
                      id={fieldPrefix + '-field-7' + '-' + index}
                      size="xs"
                      variant="muted"
                      value={schedule.day_of_week}
                      onChange={(e) => {
                        const newSchedules = [...recurringSchedules];
                        newSchedules[index].day_of_week = parseInt(e.target.value);
                        setRecurringSchedules(newSchedules);
                      }}
                    >
                      {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                        <option key={day} value={day}>
                          {t(`common.days.${day}`)}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="min-w-0">
                    <label
                      htmlFor={fieldPrefix + '-field-8' + '-' + index}
                      className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      {t('schedule.room')}
                    </label>
                    <Select
                      id={fieldPrefix + '-field-8' + '-' + index}
                      size="xs"
                      variant="muted"
                      value={schedule.room_id}
                      onChange={(e) => {
                        const newSchedules = [...recurringSchedules];
                        newSchedules[index].room_id = e.target.value;
                        setRecurringSchedules(newSchedules);
                      }}
                    >
                      <option value="">{t('classes.selectRoom')}</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="min-w-0">
                    <label
                      htmlFor={fieldPrefix + '-field-9' + '-' + index}
                      className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      {t('common.start')}
                    </label>
                    <Input
                      id={fieldPrefix + '-field-9' + '-' + index}
                      type="time"
                      className="min-w-0"
                      size="xs"
                      variant="muted"
                      value={schedule.start_time}
                      onChange={(e) => {
                        const newSchedules = [...recurringSchedules];
                        newSchedules[index].start_time = e.target.value;
                        setRecurringSchedules(newSchedules);
                      }}
                    />
                  </div>

                  <div className="min-w-0">
                    <label
                      htmlFor={fieldPrefix + '-field-10' + '-' + index}
                      className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      {t('common.end')}
                    </label>
                    <Input
                      id={fieldPrefix + '-field-10' + '-' + index}
                      type="time"
                      className="min-w-0"
                      size="xs"
                      variant="muted"
                      value={schedule.end_time}
                      onChange={(e) => {
                        const newSchedules = [...recurringSchedules];
                        newSchedules[index].end_time = e.target.value;
                        setRecurringSchedules(newSchedules);
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {recurringSchedules.length === 0 && (
              <div className="col-span-full px-3 py-5 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('classes.noRecurringSchedule')}
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Enrollments */}
      <div className="pt-3 border-t border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center justify-between mb-2 px-1">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Users size={12} className="text-primary" />
            <span className="font-black">{t('students.title')}</span>
            <Badge variant="primary" size="xs" className="px-2 font-black">
              {enrollments.length}
            </Badge>
          </h4>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <Select
            aria-label={t('students.selectStudent')}
            size="sm"
            variant="muted"
            icon={<Search />}
            value={selectedStudentId || ''}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="flex-1"
          >
            <option value="">{t('students.selectStudent')}</option>
            {allStudents
              .filter((s) => !enrollments.find((e) => String(e.id) === String(s.id)))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} {s.email ? `(${s.email})` : ''}
                </option>
              ))}
          </Select>
          <div className="flex gap-2 w-full sm:w-auto shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenBulkEnroll}
              className="flex-1 sm:flex-none px-2 sm:px-4 h-9 font-bold bg-white dark:bg-gray-800 shadow-sm text-xs sm:text-sm whitespace-nowrap"
            >
              <Plus size={14} className="mr-1 shrink-0" />
              <span className="hidden sm:inline">{t('common.bulkAdd')}</span>
              <span className="sm:hidden">Ghi danh</span>
            </Button>
            <Button
              type="button"
              onClick={() => onEnrollStudent()}
              disabled={!selectedStudentId}
              size="sm"
              className="flex-1 sm:flex-none px-2 sm:px-4 h-9 font-bold text-xs sm:text-sm whitespace-nowrap"
            >
              <Plus size={14} className="mr-1 shrink-0" />
              <span className="hidden sm:inline">{t('students.addClass')}</span>
              <span className="sm:hidden">Thêm</span>
            </Button>
          </div>
        </div>

        <Card
          variant="muted"
          scrollable={true}
          className="max-h-[180px] lg:max-h-[clamp(7rem,calc(100dvh-34rem),16rem)]"
          bodyClassName="p-3 custom-scrollbar lg:overscroll-contain"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {enrollments.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 group hover:border-primary/30 transition-all shadow-sm"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-gray-900 dark:text-white truncate">
                    {s.full_name}
                  </p>
                  {s.email && (
                    <p className="text-[9px] text-gray-400 dark:text-gray-500 truncate">
                      {s.email}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t('classes.removeStudent', { name: s.full_name })}
                  onClick={() => onUnenrollStudent(s.id)}
                  className="h-6 w-6 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <X size={12} />
                </Button>
              </div>
            ))}
            {enrollments.length === 0 && (
              <div className="col-span-full py-4 text-center text-[9px] text-gray-400 font-bold uppercase tracking-widest italic">
                {t('classes.noStudents')}
              </div>
            )}
          </div>
        </Card>
      </div>
    </form>
  );
};

export default ClassForm;
