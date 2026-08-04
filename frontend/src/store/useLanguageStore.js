import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { translations } from '../i18n/translations';

export const useLanguageStore = create(
  persist(
    (set, get) => ({
      lang: 'ru', // default language: ru (options: ru, kz, en, zh)

      setLanguage: (newLang) => {
        if (['ru', 'kz', 'en', 'zh'].includes(newLang)) {
          set({ lang: newLang });
        }
      },

      t: (key) => {
        const currentLang = get().lang;
        const dict = translations[currentLang] || translations.ru;
        return dict[key] || translations.ru[key] || key;
      }
    }),
    {
      name: 'language-storage',
    }
  )
);

export const useTranslation = () => {
  const lang = useLanguageStore((state) => state.lang);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  const t = (key) => {
    const dict = translations[lang] || translations.ru;
    return dict[key] || translations.ru[key] || key;
  };

  return { lang, setLanguage, t };
};
