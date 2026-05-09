import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Globe, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { handleApiError } from '../utils/errorHelper';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const getStrength = (pw: string, t: (k: string) => string) => {
  const checks = [
    { label: t('passwordStrength.minLength'), passed: pw.length >= 8 },
    { label: t('passwordStrength.hasUppercase'), passed: /[A-Z]/.test(pw) },
    { label: t('passwordStrength.hasNumber'), passed: /[0-9]/.test(pw) },
    { label: t('passwordStrength.hasSpecial'), passed: /[^A-Za-z0-9]/.test(pw) },
  ];
  const score = checks.filter(c => c.passed).length;
  const labels = ['', t('passwordStrength.veryWeak'), t('passwordStrength.weak'), t('passwordStrength.medium'), t('passwordStrength.strong')];
  const colors = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
  return { score, label: labels[score] || '', color: colors[score] || '', checks };
};

const Register: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const { theme: currentTheme } = useTheme();

  const strength = getStrength(password, t);

  const toggleLanguage = () => i18n.changeLanguage(i18n.language.startsWith('en') ? 'vi' : 'en');

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
    if (strength.score < 3) { toast.error(t('passwordStrength.notStrongEnough')); return; }
    setIsLoading(true);
    try {
      await api.post('/auth/register', { fullName, email, password, tenantName: `${fullName}'s Center` });
      toast.success(t('auth.registerSuccess'));
      navigate('/login');
    } catch (error: any) {
      handleApiError(error, t, 'auth.registerError');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] flex flex-col justify-center py-4 sm:py-8 px-4 sm:px-6 lg:px-8 font-sans relative transition-colors duration-500 overflow-x-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 -left-24 w-72 h-72 bg-blue-400/5 dark:bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50">
        <button 
          onClick={toggleLanguage} 
          className="group flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 bg-white/60 dark:bg-gray-800/80 backdrop-blur-md border border-slate-200/50 dark:border-gray-700 rounded-lg sm:rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-all shadow-sm active:scale-95"
        >
          <Globe size={12} className="text-primary group-hover:rotate-12 transition-transform sm:w-[14px] sm:h-[14px]" />
          <span>{i18n.language.startsWith('en') ? 'English' : 'Tiếng Việt'}</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-4">
          <img src="/logo.png" alt="EduSchedule Logo" className="w-16 h-16 rounded-xl shadow-2xl shadow-primary/20 transition-all duration-500 object-cover" />
        </div>
        <h2 className="text-center text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
          {t('auth.registerTitle')}
        </h2>
        <p className="mt-1 text-center text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
          {t('auth.registerSubtitle')}
        </p>
      </div>

      <div className="mt-3 sm:mx-auto sm:w-full sm:max-w-[420px] relative z-10">
        <div className="bg-white/40 dark:bg-gray-800/50 backdrop-blur-xl py-4 px-6 sm:px-10 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200/50 dark:border-gray-700/50">
          <form className="space-y-3" onSubmit={handleSubmit}>

            {/* Full Name */}
            <div className="space-y-1">
              <label htmlFor="fullName" className="block text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                {t('auth.fullName')}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User size={16} className="text-slate-300 group-focus-within:text-primary transition-colors" />
                </div>
                <input 
                  id="fullName" type="text" required value={fullName} onChange={e => setFullName(e.target.value)} 
                  placeholder={t('auth.fullNamePlaceholder')}
                  className="block w-full pl-11 pr-5 py-2.5 bg-slate-50/80 dark:bg-gray-900/50 border border-slate-100 dark:border-gray-800 dark:text-white rounded-lg sm:rounded-xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300 dark:placeholder:text-gray-600" 
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label htmlFor="email" className="block text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                {t('auth.email')}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={16} className="text-slate-300 group-focus-within:text-primary transition-colors" />
                </div>
                <input 
                  id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} 
                  placeholder={t('auth.emailPlaceholder')}
                  className="block w-full pl-11 pr-5 py-2.5 bg-slate-50/80 dark:bg-gray-900/50 border border-slate-100 dark:border-gray-800 dark:text-white rounded-lg sm:rounded-xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300 dark:placeholder:text-gray-600" 
                />
              </div>
            </div>

            {/* Password + Strength */}
            <div className="space-y-1">
              <label htmlFor="password" className="block text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                {t('auth.password')}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={16} className="text-gray-300 group-focus-within:text-primary transition-colors" />
                </div>
                <input 
                  id="password" type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} 
                  placeholder={t('auth.passwordPlaceholder')}
                  className="block w-full pl-11 pr-12 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 dark:text-white rounded-lg sm:rounded-xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600" 
                />
                <button 
                  type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              
              {password && (
                <div className="mt-2 px-1 animate-in fade-in slide-in-from-top-1 duration-300">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= strength.score ? strength.color : 'bg-gray-100 dark:bg-gray-700'}`} />
                    ))}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{t('passwordStrength.label')}</span>
                    <span className={`text-[9px] font-black uppercase tracking-wider ${strength.score >= 3 ? 'text-green-500' : 'text-rose-500'}`}>{strength.label}</span>
                  </div>
                </div>
              )}
            </div>

            <button 
              type="submit" disabled={isLoading}
              className={`w-full py-3 px-6 bg-primary hover:bg-primary-dark text-white rounded-lg sm:rounded-xl shadow-xl shadow-primary/20 text-[11px] font-black uppercase tracking-[0.2em] transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{t('auth.registering')}</span>
                </>
              ) : (
                <span>{t('auth.registerButton')}</span>
              )}
            </button>
          </form>

          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-[7px] font-black uppercase tracking-[0.2em]">
                <span className="px-4 bg-surface dark:bg-gray-800 text-slate-400 dark:text-gray-500">{t('auth.orContinueWith')}</span>
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
                text="signup_with"
                width="100%"
              />
            </div>
          </div>

          <div className="mt-4 text-center pt-3 border-t border-slate-100 dark:border-gray-700/50 space-y-1">
            <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('auth.hasAccount')}{' '}
              <Link to="/login" className="text-primary hover:text-primary-dark font-black underline decoration-2 underline-offset-4 transition-all">
                {t('auth.loginLink')}
              </Link>
            </p>
            <p className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tight opacity-70">
              {t('auth.notReceivedVerification')}{' '}
              <Link to="/resend-verification" className="text-primary hover:text-primary-dark underline decoration-1 underline-offset-2 transition-all">
                {t('auth.resendLink')}
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

export default Register;
