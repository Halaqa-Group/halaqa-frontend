export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxtjs/i18n'],
  devtools: { enabled: true },
  devServer: { port: 3000 },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:3001/api'
    }
  },
  app: {
    head: {
      link: [
        {
          rel: 'preload',
          as: 'font',
          type: 'font/woff2',
          href: '/fonts/thmanyah/thmanyahsans-Regular.woff2',
          crossorigin: 'anonymous'
        }
      ]
    }
  },
  i18n: {
    defaultLocale: 'ar',
    strategy: 'no_prefix',
    locales: [
      { code: 'ar', name: 'العربية', file: 'ar.json', dir: 'rtl' },
      { code: 'en', name: 'English', file: 'en.json', dir: 'ltr' }
    ],
    detectBrowserLanguage: false
  },
  compatibilityDate: '2025-01-15',
  eslint: {
    config: {
      stylistic: { commaDangle: 'never', braceStyle: '1tbs' }
    }
  }
})
