import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Settings,
  Building,
  DoorOpen,
  BookOpen,
  CheckCircle2,
  Circle,
  ArrowRight,
  UserSquare2,
} from 'lucide-react';

interface SetupChecklistProps {
  hasCenterInfo?: boolean;
  hasBranches: boolean;
  hasRooms: boolean;
  hasTeachers: boolean;
  hasClasses: boolean;
}

const SetupChecklist: React.FC<SetupChecklistProps> = ({
  hasCenterInfo = true,
  hasBranches,
  hasRooms,
  hasTeachers,
  hasClasses,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const steps = [
    {
      id: 'centerInfo',
      title: t('settings.updateCenterInfo', 'Thông tin trung tâm'),
      isCompleted: hasCenterInfo,
      icon: <Settings size={16} />,
      path: '/settings',
    },
    {
      id: 'branches',
      title: t('branches.addBranch', 'Thêm chi nhánh'),
      isCompleted: hasBranches,
      icon: <Building size={16} />,
      path: '/branches',
    },
    {
      id: 'rooms',
      title: t('rooms.addRoom', 'Thêm phòng học'),
      isCompleted: hasRooms,
      icon: <DoorOpen size={16} />,
      path: '/rooms',
    },
    {
      id: 'teachers',
      title: t('teachers.addTeacher', 'Thêm giáo viên'),
      isCompleted: hasTeachers,
      icon: <UserSquare2 size={16} />,
      path: '/teachers',
    },
    {
      id: 'classes',
      title: t('classes.createFirstClass', 'Tạo lớp học'),
      isCompleted: hasClasses,
      icon: <BookOpen size={16} />,
      path: '/classes',
    },
  ];

  const completedSteps = steps.filter((s) => s.isCompleted).length;
  const progress = (completedSteps / steps.length) * 100;

  if (progress === 100) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/40 dark:shadow-none overflow-hidden relative mb-6">
      <div className="p-6 sm:p-8 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-2xl">🚀</span>
              {t('dashboard.setupGuide', 'Setup Guide')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t(
                'dashboard.setupGuideDesc',
                'Complete these steps to get your center up and running.'
              )}
            </p>
          </div>
          <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900/50 px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                {t('common.progress', 'Progress')}
              </span>
              <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                {completedSteps}/{steps.length}
              </span>
            </div>
            <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-primary transition-all duration-1000 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          {steps.map((step) => (
            <div
              key={step.id}
              onClick={() => !step.isCompleted && navigate(step.path)}
              className={`
                flex-1 min-w-[180px] sm:min-w-[200px] relative p-5 rounded-xl border-2 transition-all duration-300
                ${
                  step.isCompleted
                    ? 'border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-900/10'
                    : 'border-gray-100 hover:border-indigo-100 bg-white hover:bg-indigo-50/30 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-900/50 cursor-pointer group shadow-sm hover:shadow-md'
                }
              `}
            >
              <div className="flex justify-between items-start mb-4">
                <div
                  className={`p-2 rounded-lg ${step.isCompleted ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors'}`}
                >
                  {step.icon}
                </div>
                {step.isCompleted ? (
                  <CheckCircle2 className="text-emerald-500 w-5 h-5" />
                ) : (
                  <Circle className="text-gray-300 dark:text-gray-600 w-5 h-5 group-hover:text-indigo-300 transition-colors" />
                )}
              </div>
              <h3
                className={`font-bold text-sm mb-1 ${step.isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}
              >
                {step.title}
              </h3>
              {!step.isCompleted && (
                <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                  {t('common.setupNow', 'Setup Now')} <ArrowRight size={12} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SetupChecklist;
