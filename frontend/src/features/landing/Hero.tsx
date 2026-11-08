import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { ROUTES } from '@/utils/constants';

const Hero: React.FC = () => {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden bg-[#faf9ff] dark:bg-slate-950">
      <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 pb-12 pt-14 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:pb-20 lg:pt-20">
        <div className="relative z-10">
          <p className="mb-5 inline-flex rounded-full border border-indigo-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-indigo-700 dark:border-indigo-700 dark:bg-slate-900 dark:text-indigo-300">
            {t('landing.heroEyebrow', 'Quản lý trung tâm giáo dục')}
          </p>
          <h1 className="max-w-xl text-4xl font-black leading-tight tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl">
            {t('landing.heroTitle', 'Lịch học rõ ràng. Trung tâm vận hành nhẹ nhàng.')}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
            {t(
              'landing.heroSubtitle',
              'Sắp lịch lớp, theo dõi điểm danh, học viên và học phí trong cùng một nơi.'
            )}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to={ROUTES.REGISTER}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700"
            >
              {t('landing.startFree', 'Bắt đầu với gói Free')} <ArrowRight size={18} />
            </Link>
            <a
              href="#features"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {t('landing.learnMore', 'Xem tính năng')}
            </a>
          </div>
        </div>
        <img
          src="/eduschedule-hero.png"
          alt={t('landing.heroImageAlt', 'Minh họa lịch học với giáo viên và học viên')}
          className="w-full rounded-3xl object-cover shadow-xl shadow-indigo-900/10"
        />
      </div>
    </section>
  );
};
export default Hero;
