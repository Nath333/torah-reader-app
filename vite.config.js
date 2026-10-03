import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Déploiement GitHub Pages : https://Nath333.github.io/torah-reader-app/
const BASE = '/torah-reader-app/';

// Pont CRA→Vite : le code source lit encore process.env.NODE_ENV et
// process.env.PUBLIC_URL (un define évite de réécrire chaque fichier).
// - build  : production + PUBLIC_URL de déploiement
// - dev    : development + PUBLIC_URL de déploiement (servi sous base)
// - vitest : test + PUBLIC_URL vide (parité exacte avec CRA/jest)
export default defineConfig(({ mode }) => ({
  base: BASE,
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(
      mode === 'production' ? 'production' : mode === 'test' ? 'test' : 'development'
    ),
    'process.env.PUBLIC_URL': JSON.stringify(mode === 'test' ? '' : BASE.replace(/\/$/, ''))
  },
  // JSX dans des fichiers .js (héritage CRA) : esbuild doit les traiter
  // [\\/] : accepte les séparateurs Windows comme POSIX
  esbuild: {
    loader: 'jsx',
    include: /src[\\/].*\.jsx?$/,
    exclude: []
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' }
    }
  },
  server: {
    port: 3000,
    proxy: {
      // Mêmes proxys que l'ancien src/setupProxy.js (clés préfixées base d'abord)
      '/torah-reader-app/sefaria-api': {
        target: 'https://www.sefaria.org',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/torah-reader-app\/sefaria-api/, '/api')
      },
      '/sefaria-api': {
        target: 'https://www.sefaria.org',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/sefaria-api/, '/api')
      },
      '/torah-reader-app/gtranslate-api': {
        target: 'https://translate.googleapis.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/torah-reader-app\/gtranslate-api/, '/translate_a')
      },
      '/gtranslate-api': {
        target: 'https://translate.googleapis.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/gtranslate-api/, '/translate_a')
      },
      '/torah-reader-app/lingva-api': {
        target: 'https://lingva.ml',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/torah-reader-app\/lingva-api/, '/api/v1')
      },
      '/lingva-api': {
        target: 'https://lingva.ml',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/lingva-api/, '/api/v1')
      },
      '/torah-reader-app/mymemory-api': {
        target: 'https://api.mymemory.translated.net',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/torah-reader-app\/mymemory-api/, '')
      },
      '/mymemory-api': {
        target: 'https://api.mymemory.translated.net',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/mymemory-api/, '')
      },
      '/torah-reader-app/cal-api': {
        target: 'https://cal.huc.edu',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/torah-reader-app\/cal-api/, '')
      },
      '/cal-api': {
        target: 'https://cal.huc.edu',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/cal-api/, '')
      },
      '/ollama-api': {
        target: 'http://localhost:11434',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ollama-api/, '/api')
      },
      '/torah-reader-app/halakhah-api': {
        target: 'https://halakhah.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/torah-reader-app\/halakhah-api/, '')
      },
      '/halakhah-api': {
        target: 'https://halakhah.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/halakhah-api/, '')
      }
    }
  },
  test: {
    environment: 'jsdom',
    // URL explicite : sans elle jsdom est en origine opaque et localStorage
    // n'est pas disponible (getter SecurityError → objet vide dans vitest)
    environmentOptions: { jsdom: { url: 'http://localhost:3000/' } },
    globals: true,
    // helpers.js (src/__tests__) contient des auto-tests exécutés sous jest :
    // on l'inclut pour garder la parité
    include: ['src/**/*.{test,spec}.{js,jsx}', 'src/__tests__/*.js'],
    setupFiles: ['src/setupTests.js']
  }
}));
