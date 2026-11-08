import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePublicSettings } from '@/features/admin/hooks/useSystemSettings';
import { ROUTES } from '@/utils/constants';
import { getZaloUrl } from '@/utils/systemContact';

export default function Footer() {
  const { t } = useTranslation();
  const { data: settings } = usePublicSettings();
  const zaloUrl = getZaloUrl(settings?.CONTACT_ZALO);
  const brand = settings?.SYSTEM_NAME?.trim() || 'EduSchedule';
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-12 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
            <img src="/logo.png" alt="" className="h-9 w-9 rounded-lg" />
            {brand}
          </div>
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-300">
            {t('landing.footerDesc')}
          </p>
        </div>
        <div>
          <h2 className="font-bold text-slate-900 dark:text-white">{t('legal.documents')}</h2>
          <ul className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <li>
              <Link className="underline-offset-4 hover:underline" to={ROUTES.PRIVACY}>
                {t('landing.privacy')}
              </Link>
            </li>
            <li>
              <Link className="underline-offset-4 hover:underline" to={ROUTES.TERMS}>
                {t('landing.terms')}
              </Link>
            </li>
          </ul>
        </div>
        {(settings?.LEGAL_ENTITY_NAME ||
          settings?.TAX_CODE ||
          settings?.CONTACT_EMAIL ||
          settings?.CONTACT_PHONE ||
          settings?.CONTACT_ADDRESS ||
          zaloUrl) && (
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white">{t('landing.contactUs')}</h2>
            <ul className="mt-3 space-y-3 break-words text-sm text-slate-600 dark:text-slate-300">
              {settings?.LEGAL_ENTITY_NAME && <li>{settings.LEGAL_ENTITY_NAME}</li>}
              {settings?.TAX_CODE && (
                <li>
                  {t('admin.settings.taxCode')}: {settings.TAX_CODE}
                </li>
              )}
              {settings?.CONTACT_EMAIL && (
                <li>
                  <a href={`mailto:${settings.CONTACT_EMAIL}`}>{settings.CONTACT_EMAIL}</a>
                </li>
              )}
              {settings?.CONTACT_PHONE && (
                <li>
                  <a href={`tel:${settings.CONTACT_PHONE}`}>{settings.CONTACT_PHONE}</a>
                </li>
              )}
              {settings?.CONTACT_ADDRESS && <li>{settings.CONTACT_ADDRESS}</li>}
              {zaloUrl && (
                <li>
                  <a href={zaloUrl} target="_blank" rel="noopener noreferrer">
                    Zalo
                  </a>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
      <p className="mx-auto mt-10 max-w-7xl border-t border-slate-200 px-4 pt-6 text-xs text-slate-500 dark:border-slate-800 sm:px-6">
        © {new Date().getFullYear()} {brand}
      </p>
    </footer>
  );
}
