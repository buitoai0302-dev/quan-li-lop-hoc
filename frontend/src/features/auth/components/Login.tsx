import React, { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { login as loginApi, googleLogin } from '@/features/auth';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Globe, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { handleApiError } from '@/utils/errorHelper';
import { GoogleLogin } from '@react-oauth/google';
import { ERROR_CODES } from '@/utils/constants';
import { useTheme } from '@/contexts/ThemeContext';
import { Input, Button, Label } from '@/components/common/UI';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { theme: currentTheme } = useTheme();

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language.startsWith('en') ? 'vi' : 'en');
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    try {
      const { credential } = credentialResponse;
      const data = await googleLogin(credential);
      login(data.token, data.user);
      toast.success(t('auth.loginSuccess'));
      navigate('/dashboard');
    } catch (error) {
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
      const data = await loginApi({ email, password });
      login(data.token, data.user);
      toast.success(t('auth.loginSuccess'));
      navigate('/dashboard');
    } catch (error) {
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] flex flex-col justify-center py-2 sm:py-4 px-4 sm:px-6 lg:px-8 font-sans relative transition-colors duration-500 overflow-x-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-24 w-72 h-72 bg-blue-400/5 dark:bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50">
        <button
          onClick={toggleLanguage}
          className="group flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 bg-white/60 dark:bg-gray-800/80 backdrop-blur-md border border-slate-200/50 dark:border-gray-700 rounded-lg sm:rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-all shadow-sm active:scale-95"
        >
          <Globe
            size={12}
            className="text-primary group-hover:rotate-12 transition-transform sm:w-[14px] sm:h-[14px]"
          />
          <span>{i18n.language.startsWith('en') ? 'English' : 'Tiếng Việt'}</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-4">
          <img
            src="/logo.png"
            alt="EduSchedule Logo"
            className="w-16 h-16 rounded-xl shadow-2xl shadow-primary/20 transition-all duration-500 object-cover"
          />
        </div>
        <h2 className="text-center text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
          {t('auth.loginTitle')}
        </h2>
        <p className="mt-1 text-center text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
          EduSchedule — Premium Experience
        </p>
      </div>

      <div className="mt-3 sm:mx-auto sm:w-full sm:max-w-[420px] relative z-10">
        <div className="bg-white/40 dark:bg-gray-800/50 backdrop-blur-xl py-4 px-6 sm:px-10 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200/50 dark:border-gray-700/50">
          {emailNotVerified && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-lg animate-in fade-in slide-in-from-top-2 duration-500">
              <p className="text-[11px] text-amber-800 dark:text-amber-300 font-bold flex items-center gap-2">
                <span className="text-sm">⚠️</span> {t('auth.emailNotVerifiedTitle')}
              </p>
              <p className="text-[9px] text-amber-700/80 dark:text-amber-400/80 mt-0.5 leading-tight">
                {t('auth.emailNotVerifiedDesc')}{' '}
                <Link
                  to="/resend-verification"
                  className="text-primary underline font-black decoration-2 underline-offset-2"
                >
                  {t('auth.emailNotVerifiedLink')}
                </Link>
                .
              </p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label className="text-[9px] text-slate-400 dark:text-gray-500 ml-1">
                {t('auth.email')}
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                variant="muted"
                icon={<Mail />}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <Label className="text-[9px] text-slate-400 dark:text-gray-500 mb-0">
                  {t('auth.password')}
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-[9px] font-black text-primary hover:text-primary-dark uppercase tracking-wider transition-colors"
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>
              <div className="relative group">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  variant="muted"
                  icon={<Lock />}
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-primary transition-colors z-10"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center ml-1">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" className="peer sr-only" />
                  <div className="w-4 h-4 bg-gray-100 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-md peer-checked:bg-primary peer-checked:border-primary transition-all"></div>
                  <div className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="4"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                  {t('auth.rememberMe')}
                </span>
              </label>
            </div>

            <Button
              type="submit"
              loading={isLoading}
              className="w-full text-[11px] uppercase tracking-[0.2em]"
            >
              {t('auth.loginButton')}
            </Button>
          </form>

          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-[7px] font-black uppercase tracking-[0.2em]">
                <span className="px-4 bg-surface dark:bg-gray-800 text-slate-400 dark:text-gray-500">
                  {t('auth.orContinueWith')}
                </span>
              </div>
            </div>

            <div className="mt-3 flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast.error('Google Login Failed')}
                useOneTap={false}
                theme={currentTheme === 'dark' ? 'filled_black' : 'outline'}
                shape="pill"
                size="large"
                text="continue_with"
              />
            </div>
          </div>

          <div className="mt-4 text-center pt-3 border-t border-slate-100 dark:border-gray-700/50">
            <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('auth.noAccount')}{' '}
              <Link
                to="/register"
                className="text-primary hover:text-primary-dark font-black underline decoration-2 underline-offset-4 transition-all"
              >
                {t('auth.registerLink')}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-4 text-center opacity-30 select-none">
        <p className="text-[8px] font-black uppercase tracking-[0.5em] text-gray-400">
          Powered by EduSchedule Cloud
        </p>
      </div>
    </div>
  );
};

export default Login;
