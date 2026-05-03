export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxtjs/i18n', '@vueuse/nuxt'],

  ssr: false,

  devtools: { enabled: true },

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

  css: ['~/assets/css/main.css'],

  ui: {
    theme: {
      defaultVariants: {
        size: 'lg'
      }
    }
  },

  runtimeConfig: {
    public: {
      apiBase: '/api'
    }
  },

  devServer: {
    host: '127.0.0.1',
    port: 3000
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    devProxy: {
      '/api': { target: 'http://127.0.0.1:8080/api', changeOrigin: true }
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
  }
})
