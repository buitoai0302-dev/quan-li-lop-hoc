import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';

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

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const token = searchParams.get('token');
  const strength = getStrength(password, t);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error(t('auth.passwordMismatch')); return; }
    if (strength.score < 3) { toast.error(t('passwordStrength.notStrongEnough')); return; }
    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{t('auth.invalidResetLink')}</p>
          <Link to="/forgot-password" className="text-primary">{t('auth.requestNewLink')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">{t('auth.resetPasswordTitle')}</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100 dark:border-gray-700">
          {success ? (
            <div className="text-center">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('auth.resetSuccessTitle')}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{t('auth.resetSuccessDesc')}</p>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* New password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.newPassword')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock size={18} className="text-gray-400" /></div>
                  <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder={t('auth.passwordPlaceholder')}
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {password && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= strength.score ? strength.color : 'bg-gray-200 dark:bg-gray-600'}`} />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">{t('passwordStrength.label')}: <span className="font-medium">{strength.label}</span></p>
                    <div className="grid grid-cols-2 gap-x-2">
                      {strength.checks.map((c, i) => (
                        <p key={i} className={`text-xs flex items-center gap-1 ${c.passed ? 'text-green-600' : 'text-gray-400'}`}>
                          {c.passed ? '✓' : '○'} {c.label}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.confirmPassword')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock size={18} className="text-gray-400" /></div>
                  <input type={showPassword ? 'text' : 'password'} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t('auth.passwordPlaceholder')}
                    className={`block w-full pl-10 py-2 border rounded-md focus:outline-none sm:text-sm dark:bg-gray-700 dark:text-white ${confirmPassword && password !== confirmPassword ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 dark:border-gray-600 focus:ring-primary focus:border-primary'}`} />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">{t('auth.passwordMismatch')}</p>
                )}
              </div>

              <button type="submit" disabled={isLoading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>
                {isLoading ? t('auth.resettingPassword') : t('auth.resetPasswordButton')}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-primary hover:text-primary-dark">{t('auth.backToLogin')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
