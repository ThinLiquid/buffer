import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/buffer',
  build: {
    target: 'ES2022',
    sourcemap: true
  },
  plugins: [
    VitePWA({
      workbox: {
        globPatterns: ['**/*']
      },
      includeAssets: [
        '**/*'
      ]
    }),
    nodePolyfills()
  ]
})
