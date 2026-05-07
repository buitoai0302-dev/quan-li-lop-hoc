import React, { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Globe, Eye, EyeOff } from 'lucide-react';
import { handleApiError } from '../utils/errorHelper';
import { GoogleLogin } from '@react-oauth/google';
import { ERROR_CODES } from '../utils/constants';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  if (loading) return null;
  if (user) return <Navigate to="/schedule" replace />;

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language.startsWith('en') ? 'vi' : 'en');
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    try {
      const { credential } = credentialResponse;
      const response = await api.post('/auth/google', { credential });
      login(response.data.token, response.data.user, response.data.refreshToken);
      toast.success(t('auth.loginSuccess'));
      navigate('/schedule');
    } catch (error: any) {
      handleApiError(error, t, 'auth.googleLoginError');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setEmailNotVerified(false);
    try {
      const response = await api.post('/auth/login', { email, password });
      login(response.data.token, response.data.user, response.data.refreshToken);
      toast.success(t('auth.loginSuccess'));
      navigate('/schedule');
    } catch (error: any) {
      if (error.response?.data?.code === ERROR_CODES.EMAIL_NOT_VERIFIED) {
        setEmailNotVerified(true);
      } else {
        handleApiError(error, t, 'auth.loginError');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative transition-colors duration-200">
      <div className="absolute top-4 right-4">
        <button onClick={toggleLanguage} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
          <Globe size={18} className="text-primary" />
          <span>{i18n.language.startsWith('en') ? 'EN' : 'VI'}</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">{t('auth.loginTitle')}</h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">EduSchedule — Premium Edition</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100 dark:border-gray-700">

          {emailNotVerified && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">⚠️ {t('auth.emailNotVerifiedTitle')}</p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                {t('auth.emailNotVerifiedDesc')}{' '}
                <Link to="/resend-verification" className="underline font-medium">{t('auth.emailNotVerifiedLink')}</Link>.
              </p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.email')}</label>
              <input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.password')}</label>
              <div className="mt-1 relative">
                <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)}
                  className="appearance-none block w-full pr-10 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} title={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-300">
                <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded dark:bg-gray-700" />
                {t('auth.rememberMe')}
              </label>
              <Link to="/forgot-password" className="text-sm font-medium text-primary hover:text-primary-dark">{t('auth.forgotPassword')}</Link>
            </div>

            <button type="submit" disabled={isLoading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>
              {isLoading ? t('auth.loggingIn') : t('auth.loginButton')}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">{t('auth.orContinueWith')}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast.error('Google Login Failed')}
                useOneTap={false}
                theme={document.documentElement.classList.contains('dark') ? 'filled_black' : 'outline'}
                width="100%"
              />
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="font-medium text-primary hover:text-primary-dark">{t('auth.registerLink')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
