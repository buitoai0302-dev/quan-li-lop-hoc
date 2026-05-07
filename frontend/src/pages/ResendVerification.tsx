import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

const ResendVerification: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post('/auth/resend-verification', { email });
      setSent(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 font-sans relative transition-colors duration-500 overflow-x-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 -right-24 w-72 h-72 bg-blue-400/5 dark:bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary rounded-[1.5rem] shadow-2xl shadow-primary/20 flex items-center justify-center transform rotate-3 hover:rotate-0 transition-transform duration-500">
             <span className="text-white font-black text-2xl">E</span>
          </div>
        </div>
        <h2 className="text-center text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
          {t('auth.resendVerificationTitle')}
        </h2>
        <p className="mt-3 text-center text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">
          {t('auth.resendVerificationSubtitle')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[440px] relative z-10">
        <div className="bg-white/70 dark:bg-gray-800/50 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl shadow-gray-200/50 dark:shadow-none rounded-[2rem] sm:rounded-[2.5rem] border border-white dark:border-gray-700/50">
          {sent ? (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto border border-green-100 dark:border-green-800/30">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">{t('auth.resendSuccessTitle')}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">{t('auth.resendSuccessDesc', { email })}</p>
              </div>
              <div className="pt-6 border-t border-gray-50 dark:border-gray-700/50">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {t('auth.resendNotReceived')}{' '}
                  <button onClick={() => setSent(false)} className="text-primary font-black hover:underline underline-offset-4 transition-all">{t('auth.tryAgain')}</button>
                </p>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">{t('auth.email')}</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail size={18} className="text-gray-300 group-focus-within:text-primary transition-colors" />
                  </div>
                  <input 
                    id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} 
                    placeholder={t('auth.emailPlaceholder')}
                    className="block w-full pl-11 pr-5 py-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 dark:text-white rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600" 
                  />
                </div>
              </div>
              <button 
                type="submit" disabled={isLoading}
                className={`w-full py-4 px-6 bg-primary hover:bg-primary-dark text-white rounded-2xl shadow-xl shadow-primary/20 text-xs font-black uppercase tracking-[0.2em] transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>{t('auth.resending')}</span>
                  </>
                ) : (
                  <span>{t('auth.resendButton')}</span>
                )}
              </button>
            </form>
          )}

          <div className="mt-8 text-center pt-6 border-t border-gray-50 dark:border-gray-700/50">
            <Link to="/login" className="inline-flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-all">
              <ArrowLeft size={14} /> {t('auth.backToLogin')}
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center opacity-30 select-none">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400">
          Powered by EduSchedule Cloud
        </p>
      </div>
    </div>
  );
};

export default ResendVerification;
