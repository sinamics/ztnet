import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanuageDetector from "i18next-browser-languagedetector";
import global_en from "~/locales/en/translation.json";
import global_zh from "~/locales/zh/translation.json";
import global_no from "~/locales/no/translation.json";
import global_es from "~/locales/es/translation.json";

export const languages = [
  {
    code: "en",
    name: "English",
    country_code: "gb",
  },
  {
    code: "zh",
    name: "中文",
    country_code: "cn",
  },
  {
    code: "no",
    name: "Norsk",
    country_code: "no",
  },
  {
    code: "es",
    name: "Español",
    country_code: "es",
  },
];
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
      debug: false,
    });

  // await i18n.changeLanguage("en");
};

export const changeLanguage = async (lng: string) => {
  await i18n.changeLanguage(lng);
};

// eslint-disable-next-line no-console
initI18n().catch((error) => console.error(error));
