import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Rocket,
  Calendar,
  Database,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  X,
  Info,
  MessageSquare
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { USER_ROLES } from '../utils/constants';
import type { HelpCategory } from '../types';



const Help: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory | null>(null);

  const allCategories = [
    {
      id: 'getting-started',
      icon: <Rocket className="text-orange-500" size={24} />,
      title: t('help.categories.gettingStarted.title'),
      description: t('help.categories.gettingStarted.desc'),
      steps: user?.role === USER_ROLES.TEACHER ? [
        t('help.teacher.gettingStarted.step1'),
        t('help.teacher.gettingStarted.step2'),
        t('help.teacher.gettingStarted.step3'),
      ] : [
        t('help.categories.gettingStarted.step1'),
        t('help.categories.gettingStarted.step2'),
        t('help.categories.gettingStarted.step3'),
      ],
      details: user?.role === USER_ROLES.TEACHER ? t('help.teacher.gettingStarted.details') : t('help.categories.gettingStarted.details')
    },
    {
      id: 'scheduling',
      icon: <Calendar className="text-blue-500" size={24} />,
      title: user?.role === USER_ROLES.TEACHER ? t('menu.teachingSchedule') : t('help.categories.scheduling.title'),
      description: user?.role === USER_ROLES.TEACHER ? t('help.teacher.scheduling.desc') : t('help.categories.scheduling.desc'),
      steps: user?.role === USER_ROLES.TEACHER ? [
        t('help.teacher.scheduling.step1'),
        t('help.teacher.scheduling.step2'),
        user?.tenant_settings?.menu?.attendance !== false
          ? t('help.teacher.scheduling.step3')
          : t('help.teacher.scheduling.step3_no_attendance'),
      ] : [
        t('help.categories.scheduling.step1'),
        t('help.categories.scheduling.step2'),
        t('help.categories.scheduling.step3'),
      ],
      details: user?.role === USER_ROLES.TEACHER ? t('help.teacher.scheduling.details') : t('help.categories.scheduling.details')
    },
    {
      id: 'data-management',
      icon: <Database className="text-purple-500" size={24} />,
      title: t('help.categories.data.title'),
      description: t('help.categories.data.desc'),
      steps: [
        t('help.categories.data.step1'),
        t('help.categories.data.step2'),
      ],
      details: t('help.categories.data.details')
    },
    {
      id: 'system-admin',
      icon: <ShieldCheck className="text-green-500" size={24} />,
      title: t('help.categories.admin.title'),
      description: t('help.categories.admin.desc'),
      steps: [
        t('help.categories.admin.step1'),
        t('help.categories.admin.step2'),
      ],
      details: t('help.categories.admin.details'),
      isPremium: true
    }
  ];

  // Filter categories based on role
  const categories = allCategories.filter(cat => {
    if (user?.role === USER_ROLES.TEACHER) {
      return ['getting-started', 'scheduling'].includes(cat.id);
    }
    return true; // Admin/Staff see all
  });

  const handleContactSupport = () => {
    const subject = encodeURIComponent(t('help.supportSubject'));
    const body = encodeURIComponent(t('help.supportBody'));
    window.location.href = `mailto:support@eduschedule.com?subject=${subject}&body=${body}`;
  };

  const renderContent = (text: string) => {
    if (!text) return '';
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-primary font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="h-full overflow-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-indigo-600 rounded-2xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-4 flex items-center gap-3">
              <HelpCircle size={36} /> {t('help.title')}
            </h1>
            <p className="text-lg text-white/80 leading-relaxed">
              {t('help.subtitle')}
            </p>
          </div>
          <HelpCircle className="absolute -right-8 -bottom-8 text-white/10 w-64 h-64" />
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg group-hover:scale-110 transition-transform">
                  {cat.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{cat.title}</h3>
                    {cat.isPremium && (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-black bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-800 uppercase">
                        Premium
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{cat.description}</p>
                </div>
              </div>

              <ul className="space-y-3 mt-6">
                {cat.steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <div className="mt-1 flex-shrink-0 w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center text-[10px] font-bold">
                      {idx + 1}
                    </div>
                    {step}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setSelectedCategory(cat)}
                className="mt-8 flex items-center gap-2 text-primary font-semibold text-sm hover:underline"
              >
                {t('help.viewDetail')} <ChevronRight size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Detail Modal */}
        {selectedCategory && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-6 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                    {selectedCategory.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedCategory.title}</h2>
                      {selectedCategory.isPremium && (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-black bg-amber-500 text-white rounded-full uppercase shadow-sm">
                          Pro
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedCategory.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-8 overflow-y-auto flex-1 space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex gap-4 items-start border border-blue-100 dark:border-blue-800/50">
                  <Info className="text-blue-600 shrink-0 mt-0.5" size={20} />
                  <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed italic">
                    {t('help.detailNote')}
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <div className="w-1 h-4 bg-primary rounded-full"></div>
                    {t('help.fullTutorial')}
                  </h4>
                  <div className="text-gray-600 dark:text-gray-300 leading-relaxed space-y-4 text-base">
                    {renderContent(selectedCategory.details)}
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-4 text-sm uppercase tracking-wider">{t('help.stepsToFollow')}</h4>
                  <div className="space-y-3">
                    {selectedCategory.steps.map((step: string, i: number) => (
                      <div key={i} className="flex gap-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                        <div className="w-6 h-6 bg-primary text-white rounded-md flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                          {i + 1}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="px-8 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 active:scale-95"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Tips */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-8">
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="text-primary" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('help.quickTips.title')}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-bold text-gray-800 dark:text-gray-200">{t('help.quickTips.tip1.q')}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('help.quickTips.tip1.a')}</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-gray-800 dark:text-gray-200">{t('help.quickTips.tip2.q')}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('help.quickTips.tip2.a')}</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-gray-800 dark:text-gray-200">
                {user?.role === USER_ROLES.TEACHER ? t('help.quickTips.teacher.tip3.q') : t('help.quickTips.tip3.q')}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user?.role === USER_ROLES.TEACHER ? t('help.quickTips.teacher.tip3.a') : t('help.quickTips.tip3.a')}
              </p>
            </div>
          </div>
        </div>

        {/* External Resources */}
        <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-[3rem] border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-none">
          <div className="max-w-xl mx-auto space-y-6">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto">
              <HelpCircle size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{t('help.needSupport')}</h3>
              <p className="text-gray-500 dark:text-gray-400">{t('help.supportDesc')}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <button
                onClick={handleContactSupport}
                className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-xl font-black shadow-lg shadow-primary/30 hover:scale-105 transition-all active:scale-95"
              >
                <MessageSquare size={20} /> {t('help.contactSupport')}
              </button>
              <a
                href={`https://zalo.me/${import.meta.env.VITE_SUPPORT_ZALO_ID || '0912345678'}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-black hover:bg-gray-50 transition-all shadow-sm"
              >
                <ExternalLink size={20} /> Zalo Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;
