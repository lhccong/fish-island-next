import { defineConfig } from '@playwright/test';
import base from './playwright.chat.config';

// 先执行 npm run build；验证发布产物，避免开发服务编译与文件热更新干扰布局测试。
export default defineConfig({
  ...base,
  outputDir: 'test-results-chat-preview',
  use: { ...base.use, baseURL: 'http://127.0.0.1:4190' },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4190 --strictPort',
    url: 'http://127.0.0.1:4190',
    reuseExistingServer: false,
  },
});
