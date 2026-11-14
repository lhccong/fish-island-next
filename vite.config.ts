import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { loadEnv, type ProxyOptions } from 'vite';

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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const localProxy: Record<string, ProxyOptions> = env.VITE_DEV_API_TARGET
    ? {
        '/api': { target: env.VITE_DEV_API_TARGET, changeOrigin: true },
        ...(env.VITE_DEV_WS_TARGET
          ? {
              '/ws/': {
                target: env.VITE_DEV_WS_TARGET,
                ws: true,
                changeOrigin: true,
                rewrite: (path: string) => path.replace(/^\/ws\//, '/'),
              },
            }
          : {}),
      }
    : {};
  const proxy = { ...emoticonProxy, ...localProxy };
  return {
    plugins: [react()],
    server: { proxy },
    preview: { proxy },
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    test: { environment: 'node', include: ['src/**/*.test.ts'], clearMocks: true },
  };
});
