import { api } from './axios';
import { createI18n } from 'vue-i18n';
import { LocalStorage } from 'quasar';
import messages from 'src/i18n';

export default async ({ app }) => {
  // Create I18n instance
  const response = await api.get('/settings/params');
  const items = response.data.items;
  const languages = items.languages || ['en', 'fr'];
  const defaultLanguage = items.defaultLanguage || 'en';

  LocalStorage.set('languages', languages);

  let userDefaultLanguage =
    LocalStorage.getItem('defaultLanguage') || defaultLanguage;

  if (!languages.includes(userDefaultLanguage)) {
    userDefaultLanguage = defaultLanguage;
  }
  LocalStorage.set('defaultLanguage', userDefaultLanguage);
  const wantedLanguages = {};
  languages.map((l) => {
    messages[l]['tagline'] = items.eventNames[l];
    wantedLanguages[l] = messages[l];
  });

  const i18n = createI18n({
    locale: userDefaultLanguage,
    globalInjection: true,
    messages: wantedLanguages,
    legacy: false,
    warnHtmlInMessage: false,
  });

  // Tell app to use the I18n instance
  app.use(i18n);
};
