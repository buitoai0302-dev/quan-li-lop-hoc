import React from 'react';
import { Calendar, Info, User, MapPin, FileText, Clock } from 'lucide-react';
import { Button, Input, Select, Label, Modal } from '@/components/common/UI';
import type { ClassData, Room, Teacher, Session } from '@/types';
import type { TFunction } from 'i18next';

interface SessionFormState {
  classId: string;
  roomId: string;
  teacherId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  notes: string;
}

interface SessionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSession: Session | null;
  formData: SessionFormState;
  setFormData: React.Dispatch<React.SetStateAction<SessionFormState>>;
  classes: ClassData[];
  rooms: Room[];
  teachers: Teacher[];
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onDelete: () => void;
  onClassChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  t: TFunction;
}

const SessionFormModal: React.FC<SessionFormModalProps> = ({
  isOpen,
  onClose,
  editingSession,
  formData,
  setFormData,
  classes,
  rooms,
  teachers,
  onSubmit,
  onDelete,
  onClassChange,
  t,
}) => {
  const modalDateInputRef = React.useRef<HTMLInputElement>(null);

  const handleShowPicker = () => {
    const input = modalDateInputRef.current as any;
    if (input) {
      if ('showPicker' in input) input.showPicker();
      else input.click();
    }
  };

  const selectedClass = classes.find((c) => c.id === formData.classId);
  const branchId = selectedClass?.branch_id;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingSession ? t('schedule.editSession') : t('schedule.addSession')}
      size="xl"
    >
      <form onSubmit={onSubmit} className="space-y-4 py-1">
        <div className="bg-primary/5 dark:bg-primary/10 p-4 rounded-2xl border border-primary/10 dark:border-primary/20 transition-all duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label required className="text-primary dark:text-blue-400 ml-1">
                {t('schedule.date')}
              </Label>
              <Input
                ref={modalDateInputRef}
                required
                type="date"
                size="sm"
                value={formData.sessionDate}
                onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
                icon={<Calendar />}
                onClick={handleShowPicker}
                className="cursor-pointer"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label required className="text-primary dark:text-blue-400 ml-1">
                  {t('schedule.startTime')}
                </Label>
                <Input
                  required
                  type="time"
                  size="sm"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  icon={<Clock />}
                />
              </div>
              <div className="space-y-1.5">
                <Label required className="text-primary dark:text-blue-400 ml-1">
                  {t('schedule.endTime')}
                </Label>
                <Input
                  required
                  type="time"
                  size="sm"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  icon={<Clock />}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label required ml-1>
                {t('schedule.class')}
              </Label>
              <Select
                required
                size="sm"
                value={formData.classId}
                onChange={onClassChange}
                icon={<Info />}
              >
                <option value="" disabled>
                  ---
                </option>
                {classes
                  .filter((c) => c.status !== 'cancelled')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label required ml-1>
                {t('schedule.teacher')}
              </Label>
              <Select
                required
                size="sm"
                value={formData.teacherId}
                onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                icon={<User />}
              >
                <option value="" disabled>
                  ---
                </option>
                {teachers
                  .filter((t) => t.is_active !== false)
                  .filter((t) => !branchId || t.branch_id === branchId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}
                    </option>
                  ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-1 space-y-1.5">
              <Label required ml-1>
                {t('schedule.room')}
              </Label>
              <Select
                required
                size="sm"
                value={formData.roomId}
                onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                icon={<MapPin />}
              >
                <option value="" disabled>
                  ---
                </option>
                {rooms
                  .filter((r) => r.is_active !== false)
                  .filter((r) => !branchId || r.branch_id === branchId)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </Select>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label ml-1>{t('common.notes')}</Label>
              <Input
                type="text"
                size="sm"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                icon={<FileText />}
                placeholder={t('schedule.notesPlaceholder')}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
          <Button type="submit" className="flex-1 uppercase tracking-widest text-xs font-black">
            {editingSession ? t('common.update') : t('common.save')}
          </Button>
          {editingSession ? (
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
              className="px-6 uppercase tracking-widest text-[10px]"
            >
              {t('common.delete')}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="px-6 uppercase tracking-widest text-[10px]"
            >
              {t('common.cancel')}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default SessionFormModal;
