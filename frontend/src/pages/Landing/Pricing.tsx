import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';

const Pricing: React.FC = () => {
  const { t } = useTranslation();

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: '/month',
      description: 'Perfect for small tutors and independent teachers.',
      features: [
        { name: 'Up to 50 students', included: true },
        { name: 'Basic scheduling', included: true },
        { name: 'Attendance tracking', included: true },
        { name: 'Single branch', included: true },
        { name: 'Advanced analytics', included: false },
        { name: 'Custom domain', included: false },
      ],
      cta: 'Get Started',
      popular: false,
      buttonClass: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
    },
    {
      name: 'Pro',
      price: '$29',
      period: '/month',
      description: 'Ideal for growing educational centers.',
      features: [
        { name: 'Up to 500 students', included: true },
        { name: 'Advanced scheduling', included: true },
        { name: 'Attendance & Reports', included: true },
        { name: 'Up to 3 branches', included: true },
        { name: 'Advanced analytics', included: true },
        { name: 'Custom domain', included: false },
      ],
      cta: 'Start Free Trial',
      popular: true,
      buttonClass: 'bg-primary text-white hover:bg-primary-600 shadow-lg shadow-primary/30',
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For large organizations with complex needs.',
      features: [
        { name: 'Unlimited students', included: true },
        { name: 'Custom integrations', included: true },
        { name: 'Unlimited branches', included: true },
        { name: 'Dedicated support', included: true },
        { name: 'Advanced analytics', included: true },
        { name: 'Custom domain', included: true },
      ],
      cta: 'Contact Sales',
      popular: false,
      buttonClass: 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100',
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-white dark:bg-slate-900 relative">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-primary font-black uppercase tracking-widest text-sm mb-4">
            {t('landing.pricingLabel', 'Pricing Plans')}
          </h2>
          <h3 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
            {t('landing.pricingHeading', 'Simple, transparent pricing')}
          </h3>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            {t('landing.pricingSubheading', 'Choose the perfect plan for your center. No hidden fees.')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-3xl p-8 border ${
                plan.popular
                  ? 'border-primary shadow-2xl shadow-primary/10 bg-white dark:bg-slate-800 scale-100 md:scale-105 z-10'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'
              } transition-all duration-300 flex flex-col`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                  <span className="bg-primary text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              <div className="mb-8">
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{plan.name}</h4>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 h-10">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-slate-500 font-medium">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    {feature.included ? (
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        <X size={12} className="text-slate-400" />
                      </div>
                    )}
                    <span
                      className={`text-sm ${
                        feature.included ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-500 dark:text-slate-500'
                      }`}
                    >
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                to={ROUTES.REGISTER}
                className={`w-full py-3.5 rounded-xl text-center font-bold transition-all ${plan.buttonClass}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
