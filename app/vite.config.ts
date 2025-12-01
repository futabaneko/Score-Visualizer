import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages用: TAURI環境変数がない場合のみ適用
  base: process.env.GITHUB_PAGES === 'true' ? '/Score-Visualizer/' : '/',
  // Tauri用: ホスト設定
  server: {
    strictPort: true,
  },
})
