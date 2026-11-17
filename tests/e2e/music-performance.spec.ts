import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { setupMusic, releaseMusicFixture } from './music-fixture';
test.afterEach(async ({ page }) => releaseMusicFixture(page));

for (const withMusic of [false, true])
  test(`production ${withMusic ? 'music' : 'baseline'}: 60 seconds of incoming chat and typing`, async ({
    page,
    browser,
  }) => {
    test.setTimeout(90000);
    const scripts = new Set<string>();
    page.on('request', (request) => {
      const path = new URL(request.url()).pathname;
      if (path.endsWith('.js')) scripts.add(path);
    });
    const fixture = await setupMusic(page);
    await page.waitForLoadState('networkidle');
    expect([...scripts].some((path) => path.includes('MusicRuntime'))).toBe(false);
    const beforeMusic = new Set(scripts);
    if (withMusic) {
      const dialog = await fixture.open();
      await dialog.getByRole('textbox', { name: '搜索歌曲或歌手' }).fill('合成');
      await dialog.getByRole('button', { name: '搜索', exact: true }).click();
      await dialog.getByRole('button', { name: '点歌 合成歌曲1', exact: true }).click();
      await expect(dialog.getByRole('button', { name: '暂停音乐' })).toBeVisible();
      await page.keyboard.press('Escape');
      await page.waitForLoadState('networkidle');
    }
    await page.evaluate(() => {
      const data = { inputs: [] as number[], longTasks: [] as number[] };
      (window as unknown as { musicPerf: typeof data }).musicPerf = data;
      new PerformanceObserver((list) =>
        list.getEntries().forEach((entry) => data.longTasks.push(entry.duration)),
      ).observe({ type: 'longtask', buffered: false });
      document.addEventListener(
        'input',
        (event) => {
          if (
            !(event.target instanceof HTMLElement) ||
            event.target.getAttribute('aria-label') !== '消息草稿'
          )
            return;
          const start = event.timeStamp;
          requestAnimationFrame(() => data.inputs.push(performance.now() - start));
        },
        true,
      );
    });
    const draft = page.getByRole('textbox', { name: '消息草稿', exact: true });
    let received = 0;
    const started = Date.now();
    const pump = () => {
      const target = Math.floor((Date.now() - started) / 50);
      while (received < target) {
        received++;
        fixture.push(String(10000 + received), `合成持续入站消息 ${received}`);
      }
    };
    const feed = setInterval(pump, 25);
    try {
      while (Date.now() - started < 60000) await draft.pressSequentially('music ', { delay: 50 });
    } finally {
      clearInterval(feed);
      pump();
    }
    const data = await page.evaluate(
      () =>
        (window as unknown as { musicPerf: { inputs: number[]; longTasks: number[] } }).musicPerf,
    );
    const sorted = data.inputs.sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? Infinity;
    const size = (paths: Set<string>) =>
      [...paths].reduce(
        (total, path) => total + gzipSync(readFileSync(`dist${path}`)).byteLength,
        0,
      );
    const report = {
      withMusic,
      browser: browser.version(),
      viewport: page.viewportSize(),
      seconds: (Date.now() - started) / 1000,
      received,
      inputSamples: sorted.length,
      inputP95Ms: Number(p95.toFixed(2)),
      longTasks: data.longTasks.length,
      longestTaskMs: Math.max(0, ...data.longTasks),
      chatLoadedGzipBytes: size(beforeMusic),
      musicExtraGzipBytes: size(new Set([...scripts].filter((path) => !beforeMusic.has(path)))),
      scriptCountBeforeMusic: beforeMusic.size,
      neededLatestJump: await page
        .getByRole('button', { name: '查看最新消息', exact: true })
        .isVisible(),
    };
    console.log(JSON.stringify(report));
    expect(received).toBeGreaterThan(1000);
    expect(sorted.length).toBeGreaterThan(500);
    expect(p95).toBeLessThan(50);
    if (report.neededLatestJump)
      await page.getByRole('button', { name: '查看最新消息', exact: true }).click();
    await expect(page.locator(`[data-message-id="${10000 + received}"]`)).toBeVisible();
    if (withMusic)
      expect(
        await page
          .locator('audio')
          .evaluate((audio: HTMLAudioElement) => !audio.paused && audio.currentTime > 50),
      ).toBe(true);
    else await expect(page.locator('audio')).toHaveCount(0);
    expect(fixture.stats()).toMatchObject({ connections: 1, historyRequests: 1 });
  });
