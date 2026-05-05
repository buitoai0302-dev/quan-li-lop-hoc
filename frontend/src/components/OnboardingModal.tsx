import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Rocket, 
  Building, 
  Users, 
  Calendar, 
  CheckCircle2, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
  userName: string;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete, userName }) => {
  const { t } = useTranslation();
  const { updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const totalSteps = 3;

  const [branchData, setBranchData] = useState({
    name: '',
    address: '',
    phone: ''
  });

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      setIsSubmitting(true);
      try {
        await api.put('/branches/first', branchData);
        await api.post('/auth/onboarding/complete');
        // Cập nhật ngay trong context để modal không hiện lại
        updateUser({ onboarding_completed: true });
        onComplete();
      } catch (error) {
        console.error('Failed to complete onboarding:', error);
        onComplete(); 
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl max-w-2xl w-full overflow-hidden border border-white/20 animate-in zoom-in-95 duration-500">
        
        {/* Progress Bar */}
        <div className="h-2 bg-gray-100 dark:bg-gray-700 flex">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        <div className="p-8 md:p-12">
          {step === 1 && (
            <div className="space-y-6 text-center animate-in slide-in-from-bottom-8 duration-500">
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-8 animate-bounce">
                <Rocket size={40} />
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                {t('onboarding.welcome', 'Chào mừng')} {userName}!
              </h2>
              <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed">
                {t('onboarding.welcomeDesc', 'EduSchedule sẽ giúp bạn quản lý trung tâm đào tạo một cách chuyên nghiệp và hiệu quả nhất. Hãy cùng bắt đầu nhé!')}
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
              <div className="text-center">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                  {t('onboarding.setupBranch', 'Thông tin Trung tâm')}
                </h2>
                <p className="text-gray-500 dark:text-gray-400">{t('onboarding.branchDesc', 'Nhập thông tin cơ bản để chúng tôi thiết lập chi nhánh đầu tiên cho bạn.')}</p>
              </div>
              
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">{t('branches.name')} *</label>
                  <input 
                    type="text"
                    required
                    placeholder={t('onboarding.branchNamePlace', 'Ví dụ: Trung tâm Tiếng Anh ABC')}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-primary transition-all dark:text-white"
                    value={branchData.name}
                    onChange={(e) => setBranchData({...branchData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">{t('branches.address')}</label>
                  <input 
                    type="text"
                    placeholder={t('onboarding.addressPlace', 'Số 123, Đường ABC, Quận XYZ')}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-primary transition-all dark:text-white"
                    value={branchData.address}
                    onChange={(e) => setBranchData({...branchData, address: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">{t('branches.phone')}</label>
                  <input 
                    type="text"
                    placeholder="0912 345 678"
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-primary transition-all dark:text-white"
                    value={branchData.phone}
                    onChange={(e) => setBranchData({...branchData, phone: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 text-center animate-in zoom-in-95 duration-500">
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                <div className="relative bg-primary text-white rounded-full w-24 h-24 flex items-center justify-center shadow-xl shadow-primary/30">
                  <CheckCircle2 size={48} />
                </div>
              </div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                {t('onboarding.ready', 'Tất cả đã sẵn sàng!')}
              </h2>
              <p className="text-lg text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                {t('onboarding.readyDesc', 'Chúc bạn có những trải nghiệm tuyệt vời cùng EduSchedule. Nếu cần trợ giúp, đừng ngần ngại nhấn vào biểu tượng (?) nhé.')}
              </p>
            </div>
          )}

          <div className="mt-12 flex justify-center">
            <button
              onClick={handleNext}
              disabled={(step === 2 && !branchData.name) || isSubmitting}
              className="flex items-center gap-3 px-10 py-5 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/30 hover:scale-105 transition-all active:scale-95 group disabled:opacity-50 disabled:hover:scale-100"
            >
              {isSubmitting ? t('common.loading') : (step === totalSteps ? t('onboarding.startNow', 'Bắt đầu ngay') : t('common.continue', 'Tiếp tục'))}
              {!isSubmitting && <ArrowRight className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
