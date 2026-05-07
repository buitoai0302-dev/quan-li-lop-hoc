import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
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
        const response = await api.get(`/auth/verify-email?token=${token}`);
        setStatus('success');
        setMessage(response.data.message || t('auth.verifyEmailSuccessDesc'));
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-12 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100 dark:border-gray-700 text-center">

          {status === 'loading' && (
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('auth.verifyEmailLoading')}</h2>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('auth.verifyEmailSuccess')}</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-2">{message}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">{t('auth.verifyEmailRedirect')}</p>
              <Link to="/login" className="mt-6 font-medium text-primary hover:text-primary-dark">{t('auth.loginNow')}</Link>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center">
              <XCircle className="h-16 w-16 text-red-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('auth.verifyEmailFail')}</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
              <div className="space-y-3 w-full">
                {isExpired && (
                  <Link to="/resend-verification"
                    className="block w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark text-center">
                    {t('auth.resendButton')}
                  </Link>
                )}
                <Link to="/login" className="block text-sm font-medium text-primary hover:text-primary-dark">{t('auth.backToLogin')}</Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
