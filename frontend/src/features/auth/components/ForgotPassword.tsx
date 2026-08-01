import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '@/features/auth';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Input, Button, Label } from '@/components/common/UI';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] flex flex-col justify-center py-4 sm:py-8 px-4 sm:px-6 lg:px-8 font-sans relative transition-colors duration-500 overflow-x-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -left-24 w-72 h-72 bg-blue-400/5 dark:bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-primary rounded-[1rem] shadow-2xl shadow-primary/20 flex items-center justify-center transform rotate-3 hover:rotate-0 transition-transform duration-500">
            <span className="text-white font-black text-xl">E</span>
          </div>
        </div>
        <h2 className="text-center text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
          {t('auth.forgotPasswordTitle')}
        </h2>
        <p className="mt-1.5 text-center text-[9px] sm:text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-gray-500">
          {t('auth.forgotPasswordSubtitle')}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-[420px] relative z-10">
        <div className="bg-white/40 dark:bg-gray-800/50 backdrop-blur-xl py-6 px-6 sm:px-10 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200/50 dark:border-gray-700/50">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto border border-green-100 dark:border-green-800/30">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">
                  {t('auth.resetEmailSentTitle')}
                </h3>
                <p className="text-slate-500 dark:text-gray-400 text-[11px] leading-relaxed">
                  {t('auth.resetEmailSentDesc', { email })}
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-gray-700/50">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  {t('auth.resetEmailNotReceived')}{' '}
                  <button
                    onClick={() => setSent(false)}
                    className="text-primary font-black hover:underline underline-offset-4 transition-all"
                  >
                    {t('auth.tryAgain')}
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <Label ml-1 className="text-slate-400 dark:text-gray-500">
                  {t('auth.email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  variant="muted"
                  icon={<Mail />}
                />
              </div>
              <Button
                type="submit"
                loading={isLoading}
                className="w-full text-[11px] uppercase tracking-[0.2em]"
              >
                {t('auth.sendResetLink')}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center pt-4 border-t border-slate-100 dark:border-gray-700/50">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-all"
            >
              <ArrowLeft size={12} /> {t('auth.backToLogin')}
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center opacity-30 select-none">
        <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-400">
          Powered by EduSchedule Cloud
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
