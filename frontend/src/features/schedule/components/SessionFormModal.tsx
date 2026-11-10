import React from 'react';
import { Calendar, Info, User, MapPin, FileText, Clock } from 'lucide-react';
import { Button, Input, Select, Label, Modal } from '@/components/common/UI';
import type { ClassData, Room, Teacher, Session } from '@/types';
import type { TFunction } from 'i18next';
import { isAxiosError } from 'axios';
import type { CreateSessionRequest } from '../api/schedule.api';
import { handleApiError, type ApiErrorData } from '@/utils/errorHelper';
import SessionBatchFields, {
  type SessionBatchError,
  type SessionDraft,
  type SessionDraftRow,
} from './SessionBatchFields';

interface SessionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSubmitting: boolean;
  editingSession: Session | null;
  formData: SessionDraft;
  setFormData: React.Dispatch<React.SetStateAction<SessionDraft>>;
  classes: ClassData[];
  rooms: Room[];
  teachers: Teacher[];
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onSubmitBatch: (sessions: CreateSessionRequest[]) => Promise<Session[]>;
  maxBatchSessions?: number;
  onDelete: () => void;
  onClassChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  t: TFunction;
}

const SessionFormModal: React.FC<SessionFormModalProps> = ({
  isOpen,
  onClose,
  isSubmitting,
  editingSession,
  formData,
  setFormData,
  classes,
  rooms,
  teachers,
  onSubmit,
  onSubmitBatch,
  maxBatchSessions,
  onDelete,
  onClassChange,
  t,
}) => {
  const fieldPrefix = React.useId();
  const modalDateInputRef = React.useRef<HTMLInputElement>(null);
  const formId = React.useId();
  const [batchMode, setBatchMode] = React.useState(false);
  const [batchClassId, setBatchClassId] = React.useState('');
  const [batchRows, setBatchRows] = React.useState<SessionDraftRow[]>([]);
  const [batchError, setBatchError] = React.useState<SessionBatchError | null>(null);

  if (!isOpen && batchRows.length) {
    setBatchMode(false);
    setBatchRows([]);
    setBatchError(null);
  }

  const changeBatchMode = (enabled: boolean) => {
    if (enabled && !batchRows.length) {
      const { roomId, teacherId, sessionDate, startTime, endTime, notes } = formData;
      setBatchClassId(formData.classId);
      setBatchRows([
        { id: crypto.randomUUID(), roomId, teacherId, sessionDate, startTime, endTime, notes },
      ]);
    }
    setBatchMode(enabled);
  };

  const submitBatch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    const invalid = batchRows.find((row) => row.startTime >= row.endTime);
    if (invalid) {
      setBatchError({ rowId: invalid.id, message: t('schedule.invalidSessionTime') });
      return;
    }
    const overlap = batchRows.find((row, index) =>
      batchRows
        .slice(0, index)
        .some(
          (previous) =>
            row.sessionDate === previous.sessionDate &&
            row.startTime < previous.endTime &&
            previous.startTime < row.endTime
        )
    );
    if (overlap) {
      setBatchError({ rowId: overlap.id, message: t('schedule.batchOverlap') });
      return;
    }

    setBatchError(null);
    try {
      await onSubmitBatch(
        batchRows.map(({ sessionDate, startTime, endTime, roomId, teacherId, notes }) => ({
          classId: batchClassId,
          sessionDate,
          startTime,
          endTime,
          roomId,
          teacherId,
          notes,
        }))
      );
    } catch (error) {
      if (!isAxiosError<ApiErrorData>(error)) {
        setBatchError({ rowId: batchRows[0].id, message: t('common.error') });
        return;
      }
      const response = error.response?.data;
      const slot = response?.slot;
      const row = slot?.index === undefined ? undefined : batchRows[slot.index];
      if (error.response?.status === 409 && slot && row) {
        const conflict = response?.conflicts?.[0]?.conflict_type;
        setBatchError({
          rowId: row.id,
          message: t('errors.SCHEDULE_CONFLICT_AT', {
            ...slot,
            message: conflict
              ? t(`errors.${conflict}`, { defaultValue: t('errors.SCHEDULE_CONFLICT') })
              : t('errors.SCHEDULE_CONFLICT'),
          }),
        });
      } else {
        handleApiError(error, t);
      }
    }
  };

  const handleShowPicker = () => {
    const input = modalDateInputRef.current as HTMLInputElement;
    if (input) {
      if (typeof (input as any).showPicker === 'function') {
        (input as any).showPicker();
      } else {
        input.click();
      }
    }
  };

  const selectedClass = classes.find((c) => c.id === formData.classId);
  const branchId = selectedClass?.branch_id;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingSession ? t('schedule.editSession') : t('schedule.addSession')}
      placement="right"
      width="clamp(480px, 46vw, 600px)"
      closeLabel={t('common.close')}
      closeBlocked={isSubmitting}
      confirmCloseMessage={t('common.discardPanelChanges')}
      hasUnsavedChanges={batchRows.length > 1}
      footer={(requestClose) => (
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" onClick={requestClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          {editingSession && (
            <Button type="button" variant="destructive" onClick={onDelete} disabled={isSubmitting}>
              {t('common.delete')}
            </Button>
          )}
          <Button type="submit" form={formId} disabled={isSubmitting}>
            {isSubmitting
              ? t('common.saving')
              : batchMode
                ? t('schedule.saveAllSessions', { count: batchRows.length })
                : editingSession
                  ? t('common.update')
                  : t('common.save')}
          </Button>
        </div>
      )}
    >
      {!editingSession && maxBatchSessions && (
        <div className="relative isolate mb-3 grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <div aria-hidden="true" className="pointer-events-none absolute inset-1">
            <div
              className={`h-full w-1/2 rounded-lg bg-indigo-600 shadow-sm motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out ${batchMode ? 'translate-x-full' : ''}`}
            />
          </div>
          {[false, true].map((enabled) => (
            <button
              key={String(enabled)}
              type="button"
              aria-pressed={batchMode === enabled}
              disabled={isSubmitting}
              onClick={() => changeBatchMode(enabled)}
              className="relative min-h-11 rounded-lg px-2 text-sm font-semibold text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 aria-pressed:text-white dark:text-slate-300 dark:aria-pressed:text-white"
            >
              {t(enabled ? 'schedule.multipleSessions' : 'schedule.singleSession')}
            </button>
          ))}
        </div>
      )}
      <form id={formId} onSubmit={batchMode ? submitBatch : onSubmit} className="space-y-4 py-1">
        {batchMode ? (
          <fieldset disabled={isSubmitting}>
            <SessionBatchFields
              classId={batchClassId}
              rows={batchRows}
              maxBatchSessions={maxBatchSessions ?? 0}
              classes={classes}
              rooms={rooms}
              teachers={teachers}
              error={batchError}
              t={t}
              onClassChange={(id) => {
                const selected = classes.find((cls) => cls.id === id);
                setBatchClassId(id);
                setBatchRows(
                  batchRows.map((row) => ({
                    ...row,
                    roomId:
                      rooms.find(
                        (room) => room.branch_id === selected?.branch_id && room.is_active !== false
                      )?.id || '',
                    teacherId:
                      teachers.find(
                        (teacher) =>
                          teacher.id === selected?.teacher_id && teacher.is_active !== false
                      )?.id || '',
                  }))
                );
                setBatchError(null);
              }}
              onRowsChange={(rows) => {
                setBatchRows(rows);
                setBatchError(null);
              }}
            />
          </fieldset>
        ) : (
          <>
            <div className="bg-primary/5 dark:bg-primary/10 p-4 rounded-2xl border border-primary/10 dark:border-primary/20 transition-all duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor={fieldPrefix + '-field-1'}
                    required
                    className="text-primary dark:text-blue-400  ml-1"
                  >
                    {t('schedule.date')}
                  </Label>
                  <Input
                    id={fieldPrefix + '-field-1'}
                    aria-required="true"
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
                    <Label
                      htmlFor={fieldPrefix + '-field-2'}
                      required
                      className="text-primary dark:text-blue-400  ml-1"
                    >
                      {t('schedule.startTime')}
                    </Label>
                    <Input
                      id={fieldPrefix + '-field-2'}
                      aria-required="true"
                      required
                      type="time"
                      size="sm"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      icon={<Clock />}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor={fieldPrefix + '-field-3'}
                      required
                      className="text-primary dark:text-blue-400  ml-1"
                    >
                      {t('schedule.endTime')}
                    </Label>
                    <Input
                      id={fieldPrefix + '-field-3'}
                      aria-required="true"
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
                  <Label htmlFor={fieldPrefix + '-field-4'} required className="ml-1">
                    {t('schedule.class')}
                  </Label>
                  <Select
                    id={fieldPrefix + '-field-4'}
                    aria-required="true"
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
                  <Label htmlFor={fieldPrefix + '-field-5'} required className="ml-1">
                    {t('schedule.teacher')}
                  </Label>
                  <Select
                    id={fieldPrefix + '-field-5'}
                    aria-required="true"
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
                  <Label htmlFor={fieldPrefix + '-field-6'} required className="ml-1">
                    {t('schedule.room')}
                  </Label>
                  <Select
                    id={fieldPrefix + '-field-6'}
                    aria-required="true"
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
                  <Label htmlFor={fieldPrefix + '-field-7'} className="ml-1">
                    {t('common.notes')}
                  </Label>
                  <Input
                    id={fieldPrefix + '-field-7'}
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
          </>
        )}
      </form>
    </Modal>
  );
};

export default SessionFormModal;
