// NexusLog i18n Configuration
// Using react-i18next with i18next for EN/FR translations

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import fr from "./locales/fr.json";

// Get saved language from localStorage, default to English
const savedLanguage =
  typeof window !== "undefined"
    ? localStorage.getItem("nexuslog-lang") || "en"
    : "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: savedLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false, // React already escapes by default
  },
  react: {
    useSuspense: false, // Avoid SSR issues with Next.js static export
  },
});

export default i18n;
