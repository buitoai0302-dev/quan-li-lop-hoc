import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

const Hero: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 dark:bg-primary/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 dark:bg-primary/20 text-primary font-bold text-xs uppercase tracking-widest mb-8 border border-primary/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          {t('landing.newRelease', 'New Release 2.0')}
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1] max-w-4xl mx-auto mb-6">
          {t('landing.heroTitle', 'Manage your educational center with ')}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
            {t('landing.heroTitleHighlight', 'ultimate ease')}
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
          {t(
            'landing.heroSubtitle',
            'EduSchedule is the most comprehensive platform to schedule classes, track attendance, and manage students seamlessly across multiple branches.'
          )}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to={ROUTES.REGISTER}
            className="w-full sm:w-auto px-8 py-4 text-base font-black text-white bg-primary hover:bg-primary-600 rounded-2xl shadow-xl shadow-primary/30 transition-all hover:-translate-y-1 flex items-center justify-center gap-2 group"
          >
            {t('landing.startFree', 'Start for Free')}
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto px-8 py-4 text-base font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2"
          >
            {t('landing.learnMore', 'Learn More')}
          </a>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-4 sm:gap-8 text-sm font-bold text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />{' '}
            {t('landing.noCreditCard', 'No credit card required')}
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />{' '}
            {t('landing.cancelAnytime', 'Cancel anytime')}
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />{' '}
            {t('landing.freeSupport', 'Free 24/7 support')}
          </div>
        </div>

        {/* Dashboard Preview Mockup */}
        <div className="mt-16 sm:mt-24 relative mx-auto max-w-5xl">
          <div className="rounded-2xl sm:rounded-[2rem] border border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl p-2 sm:p-4 shadow-2xl overflow-hidden">
            <img
              src="/dashboard-mockup.png"
              alt="Dashboard Preview"
              className="w-full h-auto rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm"
              onError={(e) => {
                // Fallback if image doesn't exist yet
                const target = e.target as HTMLImageElement;
                target.src =
                  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2000';
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
