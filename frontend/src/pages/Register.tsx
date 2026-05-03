import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Globe, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { handleApiError } from '../utils/errorHelper';

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

  const strength = getStrength(password, t);

  const toggleLanguage = () => i18n.changeLanguage(i18n.language.startsWith('en') ? 'vi' : 'en');

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative transition-colors duration-200">
      <div className="absolute top-4 right-4">
        <button onClick={toggleLanguage} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
          <Globe size={18} className="text-primary" />
          <span>{i18n.language.startsWith('en') ? 'EN' : 'VI'}</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">{t('auth.registerTitle')}</h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">{t('auth.registerSubtitle')}</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100 dark:border-gray-700">
          <form className="space-y-5" onSubmit={handleSubmit}>

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.fullName')}</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User size={18} className="text-gray-400" /></div>
                <input id="fullName" type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t('auth.fullNamePlaceholder')}
                  className="appearance-none block w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.email')}</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail size={18} className="text-gray-400" /></div>
                <input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder={t('auth.emailPlaceholder')}
                  className="appearance-none block w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
              </div>
            </div>

            {/* Password + Strength */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.password')}</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock size={18} className="text-gray-400" /></div>
                <input id="password" type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder={t('auth.passwordPlaceholder')}
                  className="appearance-none block w-full pl-10 pr-10 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} title={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {password && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : 'bg-gray-200 dark:bg-gray-600'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('passwordStrength.label')}: <span className="font-medium">{strength.label}</span></p>
                  <div className="grid grid-cols-2 gap-x-4">
                    {strength.checks.map((check, i) => (
                      <p key={i} className={`text-xs flex items-center gap-1 ${check.passed ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                        <span>{check.passed ? '✓' : '○'}</span> {check.label}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button type="submit" disabled={isLoading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>
              {isLoading ? t('auth.registering') : t('auth.registerButton')}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('auth.hasAccount')}{' '}
              <Link to="/login" className="font-medium text-primary hover:text-primary-dark">{t('auth.loginLink')}</Link>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              {t('auth.notReceivedVerification')}{' '}
              <Link to="/resend-verification" className="text-primary hover:text-primary-dark">{t('auth.resendLink')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
