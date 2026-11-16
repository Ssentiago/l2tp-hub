import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ru from "../locales/ru.json";
import en from "../locales/en.json";

export const SUPPORTED_LANGS = ["ru", "en"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

const STORAGE_KEY = "l2tp-hub.lang";

function isLang(value: string | null | undefined): value is Lang {
  return value === "ru" || value === "en";
}

/** Выбирает язык: сохранённый выбор, иначе системный, иначе русский. */
export function detectLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLang(stored)) return stored;
  } catch {
    // localStorage недоступен, определяем по системе
  }
  const nav = typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "";
  return nav.startsWith("en") ? "en" : "ru";
}

/** Переключает язык и запоминает выбор. */
export function setLang(lang: Lang): void {
  void i18n.changeLanguage(lang);
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // localStorage недоступен, выбор не сохраняем
  }
}

export function currentLang(): Lang {
  const lng = i18n.resolvedLanguage;
  return isLang(lng) ? lng : "ru";
}

void i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: detectLang(),
  fallbackLng: "ru",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
