import { defineConfig } from 'vite'
import glsl from 'vite-plugin-glsl'

export default defineConfig({
  plugins: [glsl()],
  base: '/meaningless/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/examples/jsm/')) {
            return 'three-addons'
          }
          if (id.includes('/node_modules/three/')) {
            return 'three-core'
          }
          return undefined
        }
      }
    }
  }
})
