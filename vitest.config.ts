import { resolve } from 'node:path'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve('src/renderer/src'),
      '@shared': resolve('src/shared')
    }
  },
  test: {
    exclude: [...configDefaults.exclude, '.delta/**'],
    environment: 'node',
    globals: true,
    setupFiles: ['./src/test/setup.ts']
  }
})
