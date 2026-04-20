import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 使用 jsdom 環境模擬瀏覽器 DOM
    environment: 'jsdom',
    globals: false,
  },
})
