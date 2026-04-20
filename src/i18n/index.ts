import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import tl from './locales/tl.json';
import hil from './locales/hil.json';

const savedLang = typeof window !== 'undefined'
  ? localStorage.getItem('telehealth-lang') || 'en'
  : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      tl: { translation: tl },
      hil: { translation: hil },
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// Persist language changes
i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('telehealth-lang', lng);
    document.documentElement.lang = lng === 'hil' ? 'hil' : lng === 'tl' ? 'tl' : 'en';
  }
});

export default i18n;
