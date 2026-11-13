import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import type { ProxyOptions } from 'vite';

const emoticonProxy: Record<string, ProxyOptions> = {
  '/emoticon-search': {
    target: 'https://image.baidu.com',
    changeOrigin: true,
    proxyTimeout: 15000,
    timeout: 15000,
    rewrite: (path: string) => path.replace(/^\/emoticon-search/, '/search/acjson'),
    configure(proxy) {
      proxy.on('proxyReq', (request) => {
        request.removeHeader('cookie');
        request.removeHeader('authorization');
        request.removeHeader('origin');
        request.setHeader('referer', 'https://image.baidu.com/');
      });
    },
  },
};

export default defineConfig({
  plugins: [react()],
  server: { proxy: emoticonProxy },
  preview: { proxy: emoticonProxy },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'node', include: ['src/**/*.test.ts'], clearMocks: true },
});
