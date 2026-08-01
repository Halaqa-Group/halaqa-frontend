import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Generates the PWA icon set (pwa-64/192/512, maskable-512, apple-touch-180)
// from the square brand mark into public/icons. Re-run with:
//   pnpm exec pwa-assets-generator
//
// The maskable/apple icons get extra padding (0.45 vs the preset's 0.3) so the
// logo — whose own text runs close to its edges — stays inside Android's
// circular safe zone instead of being clipped.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0.45, resizeOptions: { fit: 'contain', background: '#ffffff' } },
    apple: { ...minimal2023Preset.apple, padding: 0.4, resizeOptions: { fit: 'contain', background: '#ffffff' } }
  },
  images: ['public/icons/source.png']
})
