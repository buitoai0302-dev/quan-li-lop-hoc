import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { verifyEmail } from '@/features/auth';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const token = searchParams.get('token');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus('error');
        setMessage(t('auth.verifyEmailMissingToken'));
        return;
      }
      try {
        const data = await verifyEmail(token);
        setStatus('success');
        setMessage(data.message || t('auth.verifyEmailSuccessDesc'));
        setTimeout(() => navigate('/login'), 3000);
      } catch (error: any) {
        setStatus('error');
        const msg = error.response?.data?.error || t('common.error');
        setMessage(msg);
        if (msg.includes('expired') || msg.includes('limit') || msg.includes('exist')) {
          setIsExpired(true);
        }
      }
    };
    verifyToken();
  }, [token, navigate, t]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 font-sans relative transition-colors duration-500 overflow-x-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 -right-24 w-96 h-96 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-400/5 dark:bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/70 dark:bg-gray-800/50 backdrop-blur-xl py-12 px-6 sm:px-10 shadow-2xl shadow-gray-200/50 dark:shadow-none rounded-[2rem] sm:rounded-[2.5rem] border border-white dark:border-gray-700/50 text-center">
          {status === 'loading' && (
            <div className="flex flex-col items-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-primary animate-pulse" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
                  {t('auth.verifyEmailLoading')}
                </h2>
                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  {t('auth.processing') || 'Processing...'}
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center space-y-6 animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center border border-green-100 dark:border-green-800/30">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                  {t('auth.verifyEmailSuccess')}
                </h2>
                <p className="mt-3 text-sm font-bold text-gray-500 dark:text-gray-400 leading-relaxed px-4">
                  {message}
                </p>
              </div>
              <div className="w-full pt-6 border-t border-gray-50 dark:border-gray-700/50">
                <p className="text-[11px] font-black uppercase tracking-widest text-primary animate-pulse">
                  {t('auth.verifyEmailRedirect')}
                </p>
                <Link
                  to="/login"
                  className="mt-6 inline-flex items-center justify-center px-8 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg shadow-xl shadow-primary/20 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  {t('auth.loginNow')}
                </Link>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center space-y-6 animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center border border-rose-100 dark:border-rose-800/30">
                <XCircle className="h-12 w-12 text-rose-500" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                  {t('auth.verifyEmailFail')}
                </h2>
                <p className="mt-3 text-sm font-bold text-gray-500 dark:text-gray-400 leading-relaxed px-4">
                  {message}
                </p>
              </div>
              <div className="w-full pt-6 border-t border-gray-50 dark:border-gray-700/50 space-y-4">
                {isExpired && (
                  <Link
                    to="/resend-verification"
                    className="block w-full py-4 px-6 bg-primary hover:bg-primary-dark text-white rounded-xl shadow-xl shadow-primary/20 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                  >
                    {t('auth.resendButton')}
                  </Link>
                )}
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-all"
                >
                  {t('auth.backToLogin')}
                </Link>
              </div>
            </div>
          )}
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

export default VerifyEmail;
