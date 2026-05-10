import React from 'react';
import { format } from 'date-fns';
import { Clock, User, MapPin, FileText } from 'lucide-react';
import Modal from '../Modal';
import type { Session } from '../../types';

interface SessionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
  onEdit: (session: Session) => void;
  canEdit: boolean;
  currentLocale: any;
  user: any;
  t: any;
}

const SessionDetailsModal: React.FC<SessionDetailsModalProps> = ({
  isOpen,
  onClose,
  session,
  onEdit,
  canEdit,
  currentLocale,
  user,
  t
}) => {
  if (!session) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('schedule.sessionDetails')}
      maxWidth="max-w-md"
    >
      <div className="space-y-6 py-2">
        <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
          <div className="w-12 h-12 bg-primary text-white rounded-lg flex items-center justify-center font-black text-xl shadow-lg shadow-primary/20">
            {session.class_name?.substring(0, 1).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">{session.class_name}</h3>
            <p className="text-xs font-bold text-primary uppercase tracking-wider">{session.branch_name}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded-md text-gray-500">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('schedule.time')}</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                {session.start_time.substring(0, 5)} — {session.end_time.substring(0, 5)}
              </p>
              <p className="text-xs text-gray-500">{format(new Date(session.session_date), 'EEEE, dd/MM/yyyy', { locale: currentLocale })}</p>
            </div>
          </div>

          {session.teacher_name && user?.id !== session.teacher_id && (
            <div className="flex items-start gap-3">
              <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded-md text-gray-500">
                <User size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('schedule.teacher')}</p>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{session.teacher_name}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded-md text-gray-500">
              <MapPin size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('schedule.room')}</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{session.room_name}</p>
            </div>
          </div>

          {session.notes && (
            <div className="flex items-start gap-3">
              <div className="mt-1 p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-md text-yellow-600">
                <FileText size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest">{t('common.notes')}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{session.notes}"</p>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-200 transition-all text-sm"
          >
            {t('common.close')}
          </button>
          {canEdit && (
            <button
              onClick={() => onEdit(session)}
              className="flex-1 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all text-sm"
            >
              {t('common.edit')}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default SessionDetailsModal;
