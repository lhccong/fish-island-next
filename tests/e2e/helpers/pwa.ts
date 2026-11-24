import { readFile, writeFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';

const buildPath = '.tmp-pwa-20261116/build';

export async function controlled(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;
    await new Promise<void>((resolve) =>
      navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }),
    );
  });
}

export async function publishUpdate(verify: () => Promise<void>) {
  const workerPath = `${buildPath}/sw.js`;
  const shellPath = `${buildPath}/index.html`;
  const [worker, shell] = await Promise.all([
    readFile(workerPath, 'utf8'),
    readFile(shellPath, 'utf8'),
  ]);
  try {
    await writeFile(shellPath, shell.replace('</head>', '<meta name="pwa-e2e-update"></head>'));
    await writeFile(
      workerPath,
      worker.replace(
        /const CACHE_NAME = CACHE_PREFIX \+ '[^']+';/,
        "const CACHE_NAME = CACHE_PREFIX + 'update-test';",
      ),
    );
    await verify();
  } finally {
    await writeFile(shellPath, shell);
    await writeFile(workerPath, worker);
  }
}
