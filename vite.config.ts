/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  test: { environment: 'jsdom', globals: false, setupFiles: ['./src/test-setup.ts'] },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'bpcl-logo.svg', 'hpcl-logo.svg', 'iocl-logo.webp'],
      manifest: {
        name: 'StationSight',
        short_name: 'StationSight',
        description: 'Read-only sales, nozzle and price data for Machine 1 & 2',
        theme_color: '#007dc6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
