import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { VitePWA } from 'vite-plugin-pwa'
import viteCompression from 'vite-plugin-compression'

export default defineConfig({
  build: {
    target: 'ES2022',
    sourcemap: true,
    minify: 'terser'
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
    nodePolyfills(),
    viteCompression()
  ]
})
