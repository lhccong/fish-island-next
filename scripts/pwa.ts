import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';

/** Only build outputs and explicit public installation assets may enter the cache. */
export function pwa(): Plugin {
  return {
    name: 'fish-island-pwa',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const template = readFileSync(new URL('./pwa-worker.js', import.meta.url), 'utf8');
      const publicFiles = [
        'manifest.webmanifest',
        'pwa/icon-192.png',
        'pwa/icon-512.png',
        'pwa/apple-touch-icon.png',
      ];
      const builtFiles = Object.keys(bundle)
        .filter((name) => name === 'index.html' || /\.(js|css)$/.test(name))
        .sort();
      const hash = createHash('sha256').update(template);
      for (const name of builtFiles) {
        const file = bundle[name]!;
        hash.update(name).update(file.type === 'chunk' ? file.code : file.source);
      }
      for (const name of publicFiles) {
        hash.update(name).update(readFileSync(new URL(`../public/${name}`, import.meta.url)));
      }
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template
          .replace('__VERSION__', hash.digest('hex').slice(0, 20))
          .replace('__PRECACHE__', JSON.stringify([...builtFiles, ...publicFiles])),
      });
    },
  };
}
