import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';

/** Only build outputs and explicit public app assets may enter the cache. */
export function pwa(): Plugin {
  return {
    name: 'fish-island-pwa',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const template = readFileSync(new URL('./pwa-worker.js', import.meta.url), 'utf8');
      const publicUrls = [
        'manifest.webmanifest',
        'pwa/app-192.png',
        'pwa/app-512.png',
        'pwa/app-maskable-512.png',
        'pwa/apple-touch-icon-180.png',
        'favicon.ico?v=moyudao-2',
      ];
      const builtFiles = Object.keys(bundle)
        .filter((name) => name === 'index.html' || /\.(js|css)$/.test(name))
        .sort();
      const hash = createHash('sha256').update(template);
      for (const name of builtFiles) {
        const file = bundle[name]!;
        hash.update(name).update(file.type === 'chunk' ? file.code : file.source);
      }
      for (const url of publicUrls) {
        hash.update(url).update(readFileSync(new URL(`../public/${url}`, import.meta.url)));
      }
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template
          .replace('__VERSION__', hash.digest('hex').slice(0, 20))
          .replace('__PRECACHE__', JSON.stringify([...builtFiles, ...publicUrls])),
      });
    },
  };
}
