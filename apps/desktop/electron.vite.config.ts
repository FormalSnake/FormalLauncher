import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { version } from './package.json'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['@formallauncher/shared', '@formallauncher/minecraft'] })],
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ['@formallauncher/shared', '@formallauncher/minecraft'] })],
  },
  renderer: {
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
      },
    },
    plugins: [react(), tailwindcss()],
  },
})
