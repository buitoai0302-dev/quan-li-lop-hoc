import React, { useEffect } from 'react';
import { Calendar, Clock, Plus, Search, Users, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ClassFormProps } from '@/types';
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
  onClose,
  isSubmitting,
  t,
  startDateRef,
  endDateRef,
}) => {
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
    const input = ref.current as any;
    if (input) {
      if ('showPicker' in input) input.showPicker();
      else input.click();
    }
  };

  return (
    <form
      onSubmit={handleSubmit((data) => {
        onSubmit(data);
      })}
      className="space-y-4 py-1"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Basic Info - Left Column */}
        <div className="lg:col-span-7 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label required ml-1 size="xs">
                {t('classes.name')}
              </Label>
              <Input
                variant="muted"
                size="sm"
                placeholder={t('classes.namePlaceholder')}
                className={errors.name ? 'ring-2 ring-red-500' : ''}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-red-500 text-[10px] mt-1 ml-1 font-bold">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label required ml-1 size="xs">
                {t('classes.branch')}
              </Label>
              <Select
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
                <p className="text-red-500 text-[10px] mt-1 ml-1 font-bold">
                  {errors.branch_id.message}
                </p>
              )}
            </div>

            <div>
              <Label ml-1 size="xs">
                {t('classes.capacity')}
              </Label>
              <Input
                type="number"
                variant="muted"
                size="sm"
                {...register('max_capacity', { valueAsNumber: true })}
              />
            </div>

            <div className="col-span-2">
              <Label ml-1 size="xs">
                {t('classes.teacher')}
              </Label>
              <Select variant="muted" size="sm" {...register('teacher_id')}>
                <option value="">-- {t('classes.unassigned')} --</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label ml-1 size="xs">
                {t('classes.startDate')}
              </Label>
              <Input
                type="date"
                variant="muted"
                size="sm"
                icon={<Calendar />}
                onClick={() => handleShowPicker(startDateRef)}
                className="cursor-pointer"
                {...startRegisterRest}
                // eslint-disable-next-line react-hooks/immutability
                ref={(e) => {
                  startRef(e);
                  // eslint-disable-next-line react-hooks/immutability, @typescript-eslint/no-explicit-any
                  if (startDateRef) (startDateRef as any).current = e;
                }}
              />
            </div>
            <div>
              <Label ml-1 size="xs">
                {t('classes.endDate')}
              </Label>
              <Input
                type="date"
                variant="muted"
                size="sm"
                icon={<Calendar />}
                onClick={() => handleShowPicker(endDateRef)}
                className="cursor-pointer"
                {...endRegisterRest}
                // eslint-disable-next-line react-hooks/immutability
                ref={(e) => {
                  endRef(e);
                  // eslint-disable-next-line react-hooks/immutability, @typescript-eslint/no-explicit-any
                  if (endDateRef) (endDateRef as any).current = e;
                }}
              />
            </div>
          </div>
        </div>

        {/* Recurring Schedule - Right Column */}
        <div className="lg:col-span-5 flex flex-col min-h-[120px]">
          <div className="flex items-center justify-between mb-2 px-1">
            <Label className="flex items-center gap-2 mb-0" size="xs">
              <Clock size={12} className="text-primary" />
              {t('classes.recurringSchedule')}
            </Label>
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={() =>
                setRecurringSchedules([
                  ...recurringSchedules,
                  { day_of_week: 1, start_time: '08:00', end_time: '10:00', room_id: '' },
                ])
              }
              className="h-6 px-2 text-[9px]"
            >
              <Plus size={10} />
              {t('common.add')}
            </Button>
          </div>

          <Card
            variant="muted"
            scrollable={true}
            className="flex-1 p-3 custom-scrollbar space-y-2 max-h-[220px]"
          >
            {recurringSchedules.map((schedule, index) => (
              <div
                key={index}
                className="relative bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md"
              >
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={() =>
                    setRecurringSchedules(recurringSchedules.filter((_, i) => i !== index))
                  }
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full shadow-md border border-gray-100 dark:border-gray-600 text-red-500 hover:bg-red-50 z-10"
                >
                  <X size={8} />
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Select
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
                        {day === 0
                          ? t('common.days.sunday')
                          : `${t('common.days.weekday')} ${day + 1}`}
                      </option>
                    ))}
                  </Select>
                  <Select
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
                  <Input
                    type="time"
                    size="xs"
                    variant="muted"
                    value={schedule.start_time}
                    onChange={(e) => {
                      const newSchedules = [...recurringSchedules];
                      newSchedules[index].start_time = e.target.value;
                      setRecurringSchedules(newSchedules);
                    }}
                  />
                  <Input
                    type="time"
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
            ))}
            {recurringSchedules.length === 0 && (
              <div className="h-full flex items-center justify-center text-center p-4">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest italic">
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
          <Label className="flex items-center gap-2 mb-0" size="xs">
            <Users size={12} className="text-primary" />
            <span className="font-black">{t('students.title')}</span>
            <Badge variant="primary" size="xs" className="px-2 font-black">
              {enrollments.length}
            </Badge>
          </Label>
          <Button
            type="button"
            variant="secondary"
            size="xs"
            onClick={onOpenBulkEnroll}
            className="h-6 px-2 text-[9px]"
          >
            <Plus size={10} />
            {t('common.bulkAdd')}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-2">
          <Select
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
          <Button
            type="button"
            onClick={() => onEnrollStudent()}
            disabled={!selectedStudentId}
            size="sm"
            className="w-full sm:w-auto px-6 h-9"
          >
            {t('common.add')}
          </Button>
        </div>

        <Card variant="muted" scrollable={true} className="p-2 max-h-[150px] custom-scrollbar">
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
                  onClick={() => onUnenrollStudent(s.id)}
                  className="h-6 w-6 text-gray-400 hover:text-red-500 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X size={10} />
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

      <div className="flex gap-3 pt-4">
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

export default ClassForm;
