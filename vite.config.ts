import { defineConfig } from 'vite'
import glsl from 'vite-plugin-glsl'

const resolveThreeChunk = (id: string): string | null => {
  if (id.includes('/node_modules/three/examples/jsm/postprocessing/')) {
    return 'three-postprocessing'
  }
  if (id.includes('/node_modules/three/examples/jsm/loaders/')) {
    return 'three-loaders'
  }
  if (id.includes('/node_modules/three/examples/jsm/utils/')) {
    return 'three-utils'
  }
  if (id.includes('/node_modules/three/examples/jsm/controls/')) {
    return 'three-controls'
  }
  if (id.includes('/node_modules/three/examples/jsm/')) {
    return 'three-examples'
  }
  if (
    id.includes('/node_modules/three/') ||
    id.includes('/node_modules/.vite/deps/three.module-') ||
    id.endsWith('/node_modules/.vite/deps/three.js')
  ) {
    return 'three-core'
  }
  return null
}

export default defineConfig({
  plugins: [glsl()],
  base: '/meaningless/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rolldownOptions: {
      preserveEntrySignatures: false,
      output: {
        strictExecutionOrder: true,
        codeSplitting: {
          includeDependenciesRecursively: false,
          maxSize: 450 * 1024,
          groups: [
            {
              name: resolveThreeChunk,
              test(id) {
                return resolveThreeChunk(id) !== null
              }
            }
          ]
        }
      }
    }
  }
})
