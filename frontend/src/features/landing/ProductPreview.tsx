import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/common/UI/Modal';

type PreviewImage = {
  src: string;
  title: string;
  alt: string;
};

const PreviewCard: React.FC<{
  image: PreviewImage;
  priority?: boolean;
  onOpen: (image: PreviewImage) => void;
}> = ({ image, priority = false, onOpen }) => {
  const { t } = useTranslation();

  return (
    <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-indigo-950/5 dark:border-slate-700 dark:bg-slate-800">
      <button
        type="button"
        onClick={() => onOpen(image)}
        aria-label={t('landing.previewOpenFull', { screen: image.title })}
        className="block w-full cursor-zoom-in focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-indigo-500"
      >
        <img
          src={image.src}
          alt={image.alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className="block h-auto w-full"
        />
      </button>
      <figcaption className="border-t border-slate-100 px-4 py-3 text-sm font-bold text-slate-800 dark:border-slate-700 dark:text-slate-100">
        {image.title}
      </figcaption>
    </figure>
  );
};

const ProductPreview: React.FC = () => {
  const { t } = useTranslation();
  const [selectedImage, setSelectedImage] = useState<PreviewImage | null>(null);
  const closePreview = useCallback(() => setSelectedImage(null), []);

  const desktop: PreviewImage[] = [
    {
      src: '/product-dashboard-desktop.png',
      title: t('landing.previewDashboard'),
      alt: t('landing.previewDashboardAlt'),
    },
    {
      src: '/product-analytics-desktop.png',
      title: t('landing.previewAnalytics'),
      alt: t('landing.previewAnalyticsAlt'),
    },
    {
      src: '/product-schedule-desktop.png',
      title: t('landing.previewSchedule'),
      alt: t('landing.previewScheduleAlt'),
    },
    {
      src: '/product-students-desktop.png',
      title: t('landing.previewStudents'),
      alt: t('landing.previewStudentsAlt'),
    },
    {
      src: '/product-tuition-desktop.png',
      title: t('landing.previewTuition'),
      alt: t('landing.previewTuitionAlt'),
    },
  ];

  const mobile: PreviewImage[] = [
    {
      src: '/product-preview-mobile.png',
      title: t('landing.previewDashboard'),
      alt: t('landing.previewDashboardMobileAlt'),
    },
    {
      src: '/product-analytics-mobile.png',
      title: t('landing.previewAnalytics'),
      alt: t('landing.previewAnalyticsMobileAlt'),
    },
    {
      src: '/product-schedule-mobile.png',
      title: t('landing.previewSchedule'),
      alt: t('landing.previewScheduleMobileAlt'),
    },
    {
      src: '/product-tuition-mobile.png',
      title: t('landing.previewTuition'),
      alt: t('landing.previewTuitionMobileAlt'),
    },
  ];

  return (
    <section
      id="product-preview"
      className="scroll-mt-20 bg-[#f7f7ff] py-16 dark:bg-slate-900 sm:py-20"
      aria-labelledby="preview-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl sm:mb-10">
          <p className="text-sm font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            EduSchedule
          </p>
          <h2
            id="preview-heading"
            className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl"
          >
            {t('landing.previewTitle')}
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
            {t('landing.previewDesc')}
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {t('landing.previewDemoNote')}
          </p>
        </div>

        <div className="hidden lg:block">
          <PreviewCard image={desktop[0]} onOpen={setSelectedImage} />
          <div className="mt-5 grid grid-cols-2 gap-5">
            {desktop.slice(1).map((image) => (
              <PreviewCard key={image.src} image={image} onOpen={setSelectedImage} />
            ))}
          </div>
        </div>

        <div className="lg:hidden">
          <p className="mb-4 text-sm font-bold text-slate-700 dark:text-slate-200">
            {t('landing.previewMobileHint')}
          </p>
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-5 sm:-mx-6 sm:px-6">
            {mobile.map((image) => (
              <div
                key={image.src}
                className="w-[min(80vw,320px)] flex-none snap-start sm:w-[min(44vw,320px)]"
              >
                <PreviewCard image={image} onOpen={setSelectedImage} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <Modal
        isOpen={selectedImage !== null}
        onClose={closePreview}
        title={selectedImage?.title ?? ''}
        closeLabel={t('landing.previewClose')}
        size="5xl"
        className="max-w-[min(96vw,1440px)] bg-white dark:bg-slate-900"
      >
        {selectedImage && (
          <img
            src={selectedImage.src}
            alt={selectedImage.alt}
            className="mx-auto block h-auto max-w-full rounded-lg"
          />
        )}
      </Modal>
    </section>
  );
};

export default ProductPreview;
