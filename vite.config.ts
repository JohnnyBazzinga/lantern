/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';

// Shown in the Lab so a test report always says which build produced it.
const commit = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'no-git';
  }
})();

/**
 * The two faces the first screen is set in are fetched with the page, not after the stylesheet has been
 * read, so the start page never shows a fallback face first. (Later screens use the same files, by then
 * in the cache; the service worker precaches every font for offline use.)
 */
function preloadFonts(): Plugin {
  const first = /(atkinson-hyperlegible-next-latin-wght-normal|literata-latin-opsz-normal)-[\w-]+\.woff2$/;
  return {
    name: 'lantern-preload-fonts',
    transformIndexHtml: {
      order: 'post',
      handler: (_html, ctx) =>
        Object.keys(ctx.bundle ?? {})
          .filter((f) => first.test(f))
          .map((f) => ({ tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `/${f}`, crossorigin: '' }, injectTo: 'head' as const })),
    },
  };
}

// Lantern must reload with no network at all (that is the whole point of a downtime tool),
// so the app shell and the bundled synthetic drill fixtures are precached by the service worker.
export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(`${commit} built ${new Date().toISOString().slice(0, 16)}Z`) },
  plugins: [
    react(),
    tailwindcss(),
    preloadFonts(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'fixtures/**/*'],
      manifest: {
        name: 'Lantern — downtime re-entry',
        short_name: 'Lantern',
        description:
          'Turn the paper and spreadsheets of a hospital IT outage into a validated re-entry worklist, on-device.',
        theme_color: '#0f1b2d',
        background_color: '#f4f2ee',
        display: 'standalone',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,csv,xlsx,json,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/index.html',
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
