import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CreditCard,
  ArrowLeft,
  QrCode,
  CheckCircle2,
  Phone,
  Mail,
  MessageCircle,
  Info,
  Copy,
} from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import { useRequestPlanUpgrade, useSubscriptionData } from '../hooks/useSubscription';
import { usePublicSettings } from '@/features/admin/hooks/useSystemSettings';
import toast from 'react-hot-toast';
import { handleApiError } from '@/utils/errorHelper';
import type { AxiosError } from 'axios';
import type { ApiErrorData } from '@/utils/errorHelper';

interface CheckoutState {
  planId: string;
  planName: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
}

const Checkout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as CheckoutState | null;

  const { data } = useSubscriptionData();
  const { data: settings } = usePublicSettings();
  const { mutate: requestUpgradeMutate, isPending } = useRequestPlanUpgrade();

  if (!state) {
    navigate('/settings/subscription', { replace: true });
    return null;
  }

  const { planId, planName, billingCycle } = state;
  const isVi = i18n.language === 'vi';

  const plan = data?.plans?.find((p) => p.id === planId);

  if (!plan) {
    return <div>Plan not found</div>;
  }

  const monthlyPrice = isVi ? Number(plan.price_vnd) || 0 : Number(plan.price_usd) || 0;
  const yearlyPrice = isVi
    ? Number(plan.yearly_price_vnd) || 0
    : Number(plan.yearly_price_usd) || 0;
  const isYearly = billingCycle === 'YEARLY';

  const finalPrice = isYearly ? yearlyPrice : monthlyPrice;
  const transferMessageText = `Thanh toan goi ${planName} ${isYearly ? '1 nam' : '1 thang'}`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('checkout.copied'));
  };

  const handleConfirm = () => {
    requestUpgradeMutate(
      { planId, billingCycle },
      {
        onSuccess: () => {
          toast.success(t('subscription.requestSent', { planName }));
          navigate('/settings/subscription', { replace: true });
        },
        onError: (err: unknown) => {
          handleApiError(err as AxiosError<ApiErrorData>, t);
        },
      }
    );
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50/30 dark:bg-gray-900/30">
      <PageHeader
        icon={CreditCard}
        actions={
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-colors shadow-sm active:scale-95 border border-gray-200 dark:border-gray-700"
          >
            <ArrowLeft size={16} />{' '}
            <span className="hidden sm:inline">{t('checkout.backBtn', 'Quay lại')}</span>
          </button>
        }
      >
        <h1 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight px-1">
          {t('checkout.title')}
        </h1>
      </PageHeader>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Cột trái: Thông tin gói */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
              <h2 className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6">
                {t('checkout.orderSummary')}
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-gray-50 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-300 font-medium">
                    {t('checkout.planName')}
                  </span>
                  <span className="font-black text-gray-900 dark:text-white uppercase tracking-tight">
                    {planName}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-gray-50 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-300 font-medium">
                    {t('checkout.billingCycle')}
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {isYearly ? t('checkout.yearlyBilling') : t('checkout.monthlyBilling')}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-4">
                  <span className="text-lg text-gray-900 dark:text-white font-bold">
                    {t('checkout.totalAmount')}
                  </span>
                  <div className="text-right">
                    <span className="text-3xl font-black text-primary tracking-tighter">
                      {isVi ? new Intl.NumberFormat('vi-VN').format(finalPrice) : finalPrice}
                    </span>
                    <span className="text-lg font-bold text-primary ml-1">{isVi ? 'đ' : '$'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-3xl p-6 border border-blue-100 dark:border-blue-900/30">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl text-blue-600 dark:text-blue-400 mt-1 shrink-0">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-1">
                    {t('checkout.paymentGuideTitle')}
                  </h3>
                  <p className="text-sm text-blue-800/80 dark:text-blue-200/80 leading-relaxed">
                    {t('checkout.paymentGuideDesc')}
                  </p>
                </div>
              </div>
            </div>

            {/* Support / Contact */}
            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-3xl p-6 border border-amber-100 dark:border-amber-900/20">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600 dark:text-amber-500 mt-1 shrink-0">
                  <Info size={24} />
                </div>
                <div className="w-full">
                  <h3 className="font-bold text-amber-900 dark:text-amber-100 mb-2">
                    {t('checkout.needHelp')}
                  </h3>
                  <p className="text-sm text-amber-800/80 dark:text-amber-200/70 leading-relaxed mb-4">
                    {t('checkout.contactSupport')}
                  </p>

                  <div className="flex flex-col gap-3">
                    {settings?.CONTACT_PHONE && (
                      <a
                        href={`tel:${settings.CONTACT_PHONE}`}
                        className="flex items-center gap-3 text-sm text-amber-900 dark:text-amber-200 hover:text-primary transition-colors bg-white/60 dark:bg-gray-900/40 p-3 rounded-2xl"
                      >
                        <Phone size={16} />
                        <span className="font-bold">{settings.CONTACT_PHONE}</span>
                      </a>
                    )}
                    {settings?.CONTACT_ZALO && (
                      <a
                        href={settings.CONTACT_ZALO}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-sm text-amber-900 dark:text-amber-200 hover:text-primary transition-colors bg-white/60 dark:bg-gray-900/40 p-3 rounded-2xl"
                      >
                        <MessageCircle size={16} />
                        <span className="font-bold">Zalo Support</span>
                      </a>
                    )}
                    {settings?.CONTACT_EMAIL && (
                      <a
                        href={`mailto:${settings.CONTACT_EMAIL}`}
                        className="flex items-center gap-3 text-sm text-amber-900 dark:text-amber-200 hover:text-primary transition-colors bg-white/60 dark:bg-gray-900/40 p-3 rounded-2xl"
                      >
                        <Mail size={16} />
                        <span className="font-bold break-all">{settings.CONTACT_EMAIL}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cột phải: Thông tin chuyển khoản */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center">
            <h2 className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 w-full text-center">
              {t('checkout.scanQr')}
            </h2>

            {/* Dynamic VietQR Code */}
            <div className="w-full max-w-[280px] bg-white dark:bg-gray-900 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 mb-8 relative group overflow-hidden min-h-[280px] p-2">
              {settings?.PAYMENT_BANK_ID && settings?.PAYMENT_ACCOUNT_NUMBER ? (
                <img
                  src={`https://img.vietqr.io/image/${settings.PAYMENT_BANK_ID.trim().toLowerCase()}-${settings.PAYMENT_ACCOUNT_NUMBER.trim().replace(/\s/g, '')}-compact2.jpg?amount=${finalPrice}&addInfo=${encodeURIComponent(`Thanh toan goi ${planName}`)}&accountName=${encodeURIComponent(settings.PAYMENT_ACCOUNT_NAME || '')}`}
                  alt="QR Code"
                  className="w-full h-auto object-contain mix-blend-multiply dark:mix-blend-normal rounded-xl"
                />
              ) : (
                <>
                  <QrCode
                    size={64}
                    className="text-gray-300 dark:text-gray-600 group-hover:scale-110 transition-transform"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-gray-800/90 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                    <span
                      className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center px-4 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: t('checkout.noQrConfigured') }}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="w-full space-y-4 mb-8">
              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
                  {t('checkout.accountNumber')}
                </div>
                <div className="font-black text-gray-900 dark:text-white tracking-widest text-lg">
                  {settings?.PAYMENT_ACCOUNT_NUMBER || '...'}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
                  {t('checkout.bankName')}
                </div>
                <div className="font-bold text-gray-900 dark:text-white">
                  {settings?.PAYMENT_BANK_NAME || '...'}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
                  {t('checkout.accountName')}
                </div>
                <div className="font-bold text-gray-900 dark:text-white uppercase">
                  {settings?.PAYMENT_ACCOUNT_NAME || '...'}
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex items-center justify-between group">
                <div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-bold mb-1">
                    {t('checkout.transferMessage')}
                  </div>
                  <div className="font-black text-blue-900 dark:text-blue-100 uppercase tracking-wider">
                    {transferMessageText}
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(transferMessageText)}
                  className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors shadow-sm"
                  title="Copy"
                >
                  <Copy size={18} />
                </button>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              disabled={isPending}
              className="w-full py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl bg-primary text-white hover:bg-primary-dark hover:scale-[1.02] active:scale-95 shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? t('checkout.processing') : t('checkout.confirmPayment')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
