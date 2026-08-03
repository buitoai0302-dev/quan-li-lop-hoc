import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Modal } from './common/UI/Modal';
import { Button } from './common/UI/Button';
import { Send, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    category: 'bug',
    priority: 'normal',
    message: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.message.trim()) {
      toast.error(t('common.error') || 'Message is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Formspree or Web3Forms API submission
      // Replace YOUR_ACCESS_KEY_HERE with a real Web3Forms Access Key
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          access_key: import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || '', // <-- Lấy từ biến môi trường .env
          subject: `[${formData.priority.toUpperCase()}] ${formData.category} from ${user?.email || 'Anonymous'}`,
          from_name: user?.full_name || 'System User',
          from_email: user?.email,
          category: formData.category,
          priority: formData.priority,
          message: formData.message,
          tenant_id: user?.tenant_id,
          role: user?.role,
        }),
      });

      const result = await response.json();

      if (response.status === 200) {
        setIsSuccess(true);
        toast.success(t('feedback.toastSuccess', 'Gửi phản hồi thành công!'));
        setTimeout(() => {
          onClose();
          setIsSuccess(false);
          setFormData({ category: 'bug', priority: 'normal', message: '' });
        }, 2000);
      } else {
        console.error(result);
        toast.error(
          t('feedback.toastError', 'Gửi thất bại. Vui lòng kiểm tra lại cấu hình API Key.')
        );
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error(
        t('feedback.toastError', 'Gửi thất bại. Vui lòng kiểm tra lại cấu hình API Key.')
      );
      setIsSubmitting(false);
    } finally {
      if (isSubmitting) {
        setIsSubmitting(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('feedback.title', 'Gửi Phản hồi / Báo lỗi')}
      size="md"
    >
      {!isSuccess ? (
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {t(
              'feedback.description',
              'Mọi ý kiến đóng góp của bạn đều giúp chúng tôi hoàn thiện hệ thống tốt hơn.'
            )}
          </p>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('feedback.categoryLabel', 'Loại vấn đề')}
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dark:text-white"
            >
              <option value="bug">{t('feedback.categories.bug', 'Báo lỗi hệ thống (Bug)')}</option>
              <option value="feature">
                {t('feedback.categories.feature', 'Đề xuất tính năng (Feature Request)')}
              </option>
              <option value="support">
                {t('feedback.categories.support', 'Cần hỗ trợ (Support)')}
              </option>
              <option value="other">{t('feedback.categories.other', 'Góp ý khác (Other)')}</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('feedback.priorityLabel', 'Mức độ ưu tiên')}
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dark:text-white"
            >
              <option value="normal">{t('feedback.priorities.normal', 'Bình thường')}</option>
              <option value="high">{t('feedback.priorities.high', 'Gấp (High)')}</option>
              <option value="urgent">
                {t('feedback.priorities.urgent', 'Cực kỳ khẩn cấp (Urgent)')}
              </option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('feedback.messageLabel', 'Nội dung chi tiết')}{' '}
              <span className="text-rose-500">*</span>
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows={4}
              placeholder={t(
                'feedback.messagePlaceholder',
                'Vui lòng mô tả chi tiết vấn đề bạn đang gặp phải...'
              )}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.message.trim()}
              className="gap-2"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <Send size={16} />
              )}
              {t('feedback.send', 'Gửi đi')}
            </Button>
          </div>
        </form>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {t('feedback.successTitle', 'Đã gửi thành công!')}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
            {t(
              'feedback.successDesc',
              'Cảm ơn bạn đã phản hồi. Đội ngũ kỹ thuật sẽ xem xét và xử lý trong thời gian sớm nhất.'
            )}
          </p>
        </div>
      )}
    </Modal>
  );
};

export default FeedbackModal;
