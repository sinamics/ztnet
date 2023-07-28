import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanuageDetector from "i18next-browser-languagedetector";
import global_en from "~/locales/en/translation.json";
import global_zh from "~/locales/zh/translation.json";
import global_no from "~/locales/no/translation.json";
import global_es from "~/locales/es/translation.json";

export const initI18n = async () => {
  await i18n
    .use(initReactI18next)
    .use(LanuageDetector)
    .init({
      resources: {
        en: {
          translation: global_en,
        },
        zh: {
          translation: global_zh,
        },
        no: {
          translation: global_no,
        },
        es: {
          translation: global_es,
        },
      },
      fallbackLng: "en",

      interpolation: {
        escapeValue: false, // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
      },
      debug: true,
    });

  await i18n.changeLanguage("en");
};

// eslint-disable-next-line no-console
initI18n().catch((error) => console.error(error));
