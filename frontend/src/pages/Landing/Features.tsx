import React from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Users, Building2, BarChart3, DollarSign, FileUp } from 'lucide-react';

const Features: React.FC = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: <CalendarDays size={24} />,
      title: t('landing.features.schedule.title', 'Smart Scheduling'),
      description: t(
        'landing.features.schedule.desc',
        'Effortlessly create and manage complex class schedules without conflicts.'
      ),
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    },
    {
      icon: <Users size={24} />,
      title: t('landing.features.attendance.title', 'Attendance Tracking'),
      description: t(
        'landing.features.attendance.desc',
        'Track student and teacher attendance in real-time with comprehensive reports.'
      ),
      color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    },
    {
      icon: <Building2 size={24} />,
      title: t('landing.features.multitenant.title', 'Multi-Branch Support'),
      description: t(
        'landing.features.multitenant.desc',
        'Manage multiple branches or entire organizations from a single unified dashboard.'
      ),
      color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    },
    {
      icon: <BarChart3 size={24} />,
      title: t('landing.features.analytics.title', 'Advanced Analytics'),
      description: t(
        'landing.features.analytics.desc',
        'Gain actionable insights with detailed statistics and performance dashboards.'
      ),
      color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    },
    {
      icon: <DollarSign size={24} />,
      title: t('landing.features.tuition.title', 'Comprehensive Tuition Management'),
      description: t(
        'landing.features.tuition.desc',
        'Automate billing generation, payment collection, discount calculation, and student debt tracking.'
      ),
      color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    },
    {
      icon: <FileUp size={24} />,
      title: t('landing.features.data.title', 'Smart Data Import/Export'),
      description: t(
        'landing.features.data.desc',
        'Easily synchronize and backup data with Excel/CSV. Automatic analysis prevents duplicates.'
      ),
      color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    },
  ];

  return (
    <section id="features" className="py-24 bg-slate-50 dark:bg-[#0F172A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-primary font-black uppercase tracking-widest text-sm mb-4">
            {t('landing.featuresLabel', 'Core Features')}
          </h2>
          <h3 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
            {t('landing.featuresHeading', 'Everything you need to run your center')}
          </h3>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            {t(
              'landing.featuresSubheading',
              'Powerful tools designed specifically for educational institutions and learning centers.'
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${feature.color}`}
              >
                {feature.icon}
              </div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                {feature.title}
              </h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
