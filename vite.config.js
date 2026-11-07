import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages publiserer på https://sdalen.github.io/sil15/, lokalt kjører vi på /
export default defineConfig(({ command }) => {
  const base = command === 'build' ? '/sil15/' : '/'
  return {
  base,
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Storhamar U12 – lag og kamper',
        short_name: 'Storhamar U12',
        description: 'Lagoppsett og serieoppsett for Storhamar U12 (2015) sesongen 2026–2027',
        lang: 'nb',
        theme_color: '#0b1f3a',
        background_color: '#0b1f3a',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
}
})
