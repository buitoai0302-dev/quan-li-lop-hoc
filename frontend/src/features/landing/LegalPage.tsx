import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePublicSettings } from '@/features/admin/hooks/useSystemSettings';
import { ROUTES } from '@/utils/constants';
import Header from './Header';
import Footer from './Footer';

type LegalKind = 'privacy' | 'terms';

function LegalPage({ kind }: { kind: LegalKind }) {
  const { t, i18n } = useTranslation();
  const { data: settings, isLoading, isError } = usePublicSettings();
  const language = i18n.language.startsWith('en') ? 'EN' : 'VI';
  const text =
    kind === 'privacy'
      ? settings?.[`PRIVACY_POLICY_${language}`]
      : settings?.[`TERMS_OF_SERVICE_${language}`];
  const title = kind === 'privacy' ? t('landing.privacy') : t('landing.terms');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <Header />
      <main className="mx-auto min-h-[60vh] max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <nav className="mb-8 text-sm">
          <Link to={ROUTES.HOME} className="text-indigo-600 underline dark:text-indigo-400">
            {t('legal.home')}
          </Link>
        </nav>
        <h1 className="text-3xl font-black sm:text-4xl">{title}</h1>
        {settings?.LEGAL_ENTITY_NAME && (
          <p className="mt-3 text-slate-600 dark:text-slate-300">{settings.LEGAL_ENTITY_NAME}</p>
        )}
        {settings?.LEGAL_EFFECTIVE_DATE && (
          <p className="mt-1 text-sm text-slate-500">
            {t('legal.effectiveDate')}: {settings.LEGAL_EFFECTIVE_DATE}
          </p>
        )}
        {isLoading && (
          <p role="status" className="mt-8">
            {t('legal.loading')}
          </p>
        )}
        {isError && (
          <p role="alert" className="mt-8">
            {t('legal.loadError')}
          </p>
        )}
        {!isLoading &&
          !isError &&
          (text?.trim() ? (
            <div className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 leading-8 dark:border-slate-700 dark:bg-slate-900 sm:p-10">
              {text
                .trim()
                .split(/\n\s*\n/)
                .map((paragraph, index) =>
                  paragraph.trim().startsWith('## ') ? (
                    <h2 key={index} className="pt-3 text-xl font-bold">
                      {paragraph.trim().slice(3)}
                    </h2>
                  ) : (
                    <p key={index} className="whitespace-pre-line break-words">
                      {paragraph.trim()}
                    </p>
                  )
                )}
            </div>
          ) : (
            <p
              role="status"
              className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
            >
              {t('legal.unpublished')}
            </p>
          ))}
        {(settings?.CONTACT_EMAIL || settings?.CONTACT_ADDRESS || settings?.CONTACT_PHONE) && (
          <address className="mt-8 space-y-1 not-italic text-sm text-slate-600 dark:text-slate-300">
            <strong className="block text-slate-900 dark:text-white">
              {t('landing.contactUs')}
            </strong>
            {settings.CONTACT_EMAIL && (
              <a className="block underline" href={`mailto:${settings.CONTACT_EMAIL}`}>
                {settings.CONTACT_EMAIL}
              </a>
            )}
            {settings.CONTACT_PHONE && (
              <a className="block underline" href={`tel:${settings.CONTACT_PHONE}`}>
                {settings.CONTACT_PHONE}
              </a>
            )}
            {settings.CONTACT_ADDRESS && <p>{settings.CONTACT_ADDRESS}</p>}
          </address>
        )}
      </main>
      <Footer />
    </div>
  );
}

export const PrivacyPage = () => <LegalPage kind="privacy" />;
export const TermsPage = () => <LegalPage kind="terms" />;
