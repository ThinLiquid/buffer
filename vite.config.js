import { defineConfig } from "vite";
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  base: '/Spotify-Visualizer',
  plugins: [
    nodePolyfills(),
  ],
})