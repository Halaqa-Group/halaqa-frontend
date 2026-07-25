export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxtjs/i18n', '@vueuse/nuxt'],

  $development: {
    nitro: {
      routeRules: {
        '/quran/fonts/**': { headers: { 'cache-control': 'no-cache' } },
        '/quran/pages/**': { headers: { 'cache-control': 'no-cache' } },
        '/quran/meta/**': { headers: { 'cache-control': 'no-cache' } }
      }
    }
  },

  ssr: false,

  devtools: { enabled: false },

  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/images/logo/favicon.svg' },
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
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api'
    }
  },

  devServer: {
    host: '127.0.0.1',
    port: 3000
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    devProxy: {
      '/api': {
        target: `http://127.0.0.1:${import.meta.env.NUXT_BACKEND_PORT}/api`,
        changeOrigin: true
      }
    },
    // Mushaf assets are baked at build time and never change for a given
    // deploy. Tagging them `immutable` lets browsers skip the conditional
    // GET on every reload — repeat-visit cost drops from ~50-100ms per file
    // to zero. If we ever need to invalidate, bump a `?v=` query in the URL.
    //
    // Production only — see the `$development` override above. These rules match the URL
    // pattern, not the file, so a request for an asset that isn't there gets
    // the SPA shell stamped `immutable`: the browser pins 3KB of HTML under a
    // .woff2 URL for a year and the page can never recover on its own. In dev
    // that happens every time the corpus is regenerated mid-session.
    routeRules: {
      '/quran/fonts/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
      '/quran/pages/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
      '/quran/meta/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } }
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

  icon: {
    provider: 'iconify',
    fallbackToApi: false,
    clientBundle: {
      scan: true
    }
  }
})
