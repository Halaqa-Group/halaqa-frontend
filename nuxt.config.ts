export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxtjs/i18n', '@vueuse/nuxt', '@vite-pwa/nuxt'],

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
      meta: [
        // viewport-fit=cover is what makes env(safe-area-inset-*) resolve to the
        // real notch / status-bar / home-indicator sizes on iOS. Without it those
        // insets are all 0 and the safe-area padding below (and in the bottom nav)
        // is a silent no-op.
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#ffffff' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        // `default` gives a white status bar with dark text (readable on the white
        // header). The safe-area strip in the layout is painted white to match.
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'مدرسة الإتقان' }
      ],
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'icon', type: 'image/svg+xml', href: '/images/logo/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '64x64', href: '/icons/pwa-64x64.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/icons/apple-touch-icon-180x180.png' },
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

  // Allow reaching the dev server through an ngrok tunnel (for testing PWA
  // install / offline on a real device over HTTPS). Dev-only; `nuxt preview`
  // has no host check. Wildcards cover ngrok's rotating free subdomains.
  vite: {
    server: {
      allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app', '.ngrok.io']
    }
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
  },

  pwa: {
    registerType: 'prompt',
    strategies: 'injectManifest',
    srcDir: 'service-worker',
    filename: 'sw.ts',
    manifest: {
      id: '/',
      name: 'مدرسة الإتقان لتحفيظ القرآن',
      short_name: 'مدرسة الإتقان',
      description: 'منصة إدارة حلقات تحفيظ القرآن: الحضور، الإنجازات، الخطط، والمصحف — تعمل دون اتصال.',
      lang: 'ar',
      dir: 'rtl',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#ffffff',
      theme_color: '#ffffff',
      icons: [
        { src: '/icons/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
        { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
    injectManifest: {
      // Precache the built shell + fonts/icons. The 46MB /quran corpus is cached
      // on demand at runtime (or via the bulk downloader), never precached.
      globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
      globIgnores: ['**/quran/**'],
      maximumFileSizeToCacheInBytes: 3 * 1024 * 1024
    },
    client: {
      // Enables $pwa.showInstallPrompt / install() for a custom A2HS button.
      installPrompt: true
    },
    // Enabled in dev so the PWA (install + offline) can be exercised on
    // `nuxt dev`. injectManifest requires `type: 'module'`. If HMR ever behaves
    // oddly, unregister the SW (DevTools ▸ Application ▸ Clear site data) — a
    // stale worker is the usual culprit, not the app.
    devOptions: {
      enabled: true,
      type: 'module',
      suppressWarnings: true
    }
  }
})
