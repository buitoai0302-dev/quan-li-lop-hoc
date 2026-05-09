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
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] flex items-center justify-center p-6 transition-colors duration-500">
        <div className="bg-white/70 dark:bg-gray-800/50 backdrop-blur-xl p-8 rounded-[2rem] border border-white dark:border-gray-700/50 shadow-2xl text-center max-w-sm w-full animate-in zoom-in-95 duration-500">
          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-100 dark:border-rose-800/30">
            <span className="text-2xl">🚫</span>
          </div>
          <p className="text-sm font-black text-rose-500 uppercase tracking-widest mb-4">{t('auth.invalidResetLink')}</p>
          <Link to="/forgot-password" className="inline-flex items-center gap-2 text-xs font-black text-primary hover:text-primary-dark uppercase tracking-widest transition-all underline decoration-2 underline-offset-4">
            {t('auth.requestNewLink')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] flex flex-col justify-center py-4 sm:py-8 px-4 sm:px-6 lg:px-8 font-sans relative transition-colors duration-500 overflow-x-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 -right-24 w-96 h-96 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-400/5 dark:bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-primary rounded-[1rem] shadow-2xl shadow-primary/20 flex items-center justify-center transform rotate-3 hover:rotate-0 transition-transform duration-500">
             <span className="text-white font-black text-xl">E</span>
          </div>
        </div>
        <h2 className="text-center text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
          {t('auth.resetPasswordTitle')}
        </h2>
        <p className="mt-1.5 text-center text-[9px] sm:text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-gray-500">
          EduSchedule Security
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-[440px] relative z-10">
        <div className="bg-white/40 dark:bg-gray-800/50 backdrop-blur-xl py-6 px-6 sm:px-10 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200/50 dark:border-gray-700/50">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto border border-green-100 dark:border-green-800/30">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">{t('auth.resetSuccessTitle')}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-[11px] leading-relaxed">{t('auth.resetSuccessDesc')}</p>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* New password */}
              <div className="space-y-1">
                <label className="block text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest ml-1">{t('auth.newPassword')}</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock size={16} className="text-slate-300 group-focus-within:text-primary transition-colors" />
                  </div>
                  <input 
                    type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} 
                    placeholder={t('auth.passwordPlaceholder')}
                    className="block w-full pl-11 pr-12 py-2.5 bg-slate-50/80 dark:bg-gray-900/50 border border-slate-100 dark:border-gray-800 dark:text-white rounded-lg sm:rounded-xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300 dark:placeholder:text-gray-600" 
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
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{t('passwordStrength.label')}</span>
                      <span className={`text-[9px] font-black uppercase tracking-wider ${strength.score >= 3 ? 'text-green-500' : 'text-rose-500'}`}>{strength.label}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-1">
                <label className="block text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest ml-1">{t('auth.confirmPassword')}</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock size={16} className="text-slate-300 group-focus-within:text-primary transition-colors" />
                  </div>
                  <input 
                    type={showPassword ? 'text' : 'password'} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} 
                    placeholder={t('auth.passwordPlaceholder')}
                    className={`block w-full pl-11 pr-5 py-2.5 bg-slate-50/80 dark:bg-gray-900/50 border dark:text-white rounded-lg sm:rounded-xl text-sm font-bold focus:outline-none focus:ring-4 transition-all ${confirmPassword && password !== confirmPassword ? 'border-rose-400 focus:ring-rose-400/10 focus:border-rose-500' : 'border-slate-100 dark:border-gray-800 focus:ring-primary/10 focus:border-primary'}`} 
                  />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 ml-1 text-[9px] font-bold text-rose-500 uppercase tracking-tight">{t('auth.passwordMismatch')}</p>
                )}
              </div>

              <button 
                type="submit" disabled={isLoading}
                className={`w-full py-3 px-6 bg-primary hover:bg-primary-dark text-white rounded-lg sm:rounded-xl shadow-xl shadow-primary/20 text-[11px] font-black uppercase tracking-[0.2em] transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>{t('auth.resettingPassword')}</span>
                  </>
                ) : (
                  <span>{t('auth.resetPasswordButton')}</span>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 text-center pt-4 border-t border-slate-100 dark:border-gray-700/50">
            <Link to="/login" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-all">
              {t('auth.backToLogin')}
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

export default ResetPassword;
