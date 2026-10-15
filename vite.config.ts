import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
  build: {
    // exceljs (~۹۰۰KB) فقط هنگام خروجی/ورودی اکسل به‌صورت lazy لود می‌شود
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
            { name: 'vendor-antd', test: /node_modules[\\/](antd|@ant-design|@rc-component|rc-[^\\/]+)[\\/]/ },
            { name: 'vendor-data', test: /node_modules[\\/](@tanstack|react-hook-form|@hookform|yup|zustand)[\\/]/ },
          ],
        },
      },
    },
  },
})
