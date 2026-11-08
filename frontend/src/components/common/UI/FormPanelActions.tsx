import { useTranslation } from 'react-i18next';
import { Button } from './Button';

interface FormPanelActionsProps {
  formId: string;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  submittingLabel?: string;
}

export function FormPanelActions({
  formId,
  onCancel,
  isSubmitting,
  submitLabel,
  submittingLabel,
}: FormPanelActionsProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap justify-end gap-3">
      <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
        {t('common.cancel')}
      </Button>
      <Button type="submit" form={formId} disabled={isSubmitting}>
        {isSubmitting ? (submittingLabel ?? t('common.saving')) : (submitLabel ?? t('common.save'))}
      </Button>
    </div>
  );
}
