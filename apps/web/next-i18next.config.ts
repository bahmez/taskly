import { Config } from 'next-i18next';
import path from 'path';

const config: Config = {
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr', 'en'],
  },
  localePath: path.resolve('./public/locales'),
  ns: ['common'],
  defaultNS: 'common',
  backend: {
    loadPath: './public/locales/{{lng}}/{{ns}}.json',
  },
  detection: {
    order: ['cookie', 'localStorage', 'navigator'],
    caches: ['localStorage', 'cookie'],
  },
  react: {
    useSuspense: false,
  },
};

export default config;
