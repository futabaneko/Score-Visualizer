import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages用: 環境変数で切り替え（Tauriビルド時は '/'）
  base: process.env.GITHUB_ACTIONS ? '/Score-Visualizer/' : '/',
  // Tauri用: ホスト設定
  server: {
    strictPort: true,
  },
})
