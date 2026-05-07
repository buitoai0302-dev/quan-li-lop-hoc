import React, { useState } from 'react';
import { HelpCircle, X, BookOpen, UserPlus, Calendar, Layout } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface HelpWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpWidget: React.FC<HelpWidgetProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const steps = [
    {
      icon: <Layout className="text-blue-500" size={20} />,
      title: t('helpWidget.step1.title'),
      desc: t('helpWidget.step1.desc')
    },
    {
      icon: <UserPlus className="text-green-500" size={20} />,
      title: t('helpWidget.step2.title'),
      desc: t('helpWidget.step2.desc')
    },
    {
      icon: <Calendar className="text-purple-500" size={20} />,
      title: t('helpWidget.step3.title'),
      desc: t('helpWidget.step3.desc')
    },
    {
      icon: <BookOpen className="text-orange-500" size={20} />,
      title: t('helpWidget.step4.title'),
      desc: t('helpWidget.step4.desc')
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 bg-primary text-white flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <BookOpen size={24} />
            <h2 className="text-xl font-bold">{t('helpWidget.title')}</h2>
          </div>
          <button 
            onClick={onClose}
            className="hover:bg-white/20 p-1 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {t('helpWidget.subtitle')}
          </p>
          
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start space-x-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="mt-1 p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600">
                  {step.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">{step.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 dark:bg-gray-700/30 flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button
            onClick={() => { onClose(); navigate('/help'); }}
            className="text-primary hover:underline text-sm font-semibold order-2 sm:order-1"
          >
            {t('helpWidget.viewFull')}
          </button>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-8 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20 order-1 sm:order-2"
          >
            {t('helpWidget.understand')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpWidget;
