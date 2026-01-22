'use client';

import React, { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react';

type Language = 'fr' | 'en';

interface LanguageContextType {
  language: Language;
  changeLanguage: (lang: Language) => void;
  mounted: boolean;
}

// Create the context
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation storage
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const translations: Record<Language, Record<string, any>> = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  fr: require('../../public/locales/fr/common.json'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  en: require('../../public/locales/en/common.json'),
};

// Provider component
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('fr');
  const [mounted, setMounted] = useState(false);

  // Initialize language from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('language') as Language | null;
    if (saved && ['fr', 'en'].includes(saved)) {
      setLanguage(saved);
      document.documentElement.lang = saved;
    }
    setMounted(true);
  }, []);

  const changeLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
    // Update HTML lang attribute
    document.documentElement.lang = lang;
  }, []);

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, mounted }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook to use the language context
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Hook to use translations
export function useTranslation() {
  const { language, mounted } = useLanguage();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = useCallback((key: string, options?: Record<string, string | number>): any => {
    const keys = key.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    // Handle interpolation like {{year}}
    if (typeof value === 'string' && options) {
      let result = value;
      Object.entries(options).forEach(([optKey, optValue]) => {
        result = result.replace(`{{${optKey}}}`, String(optValue));
      });
      return result;
    }

    return value;
  }, [language]);

  return { t, language, mounted };
}
