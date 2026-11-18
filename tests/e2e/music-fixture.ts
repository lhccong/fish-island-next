import { expect, type Page } from '@playwright/test';
import { setupChatMenu } from './chat-menu-fixture';
const cleanups = new WeakMap<Page, () => Promise<void>>();

export async function releaseMusicFixture(page: Page) {
  const close = cleanups.get(page);
  cleanups.delete(page);
  await close?.();
  if (page.isClosed()) return;
  await page.locator('audio').evaluateAll((elements) =>
    elements.forEach((element) => {
      const audio = element as HTMLAudioElement;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }),
  );
}

export function silentAudio() {
  const samples = 8000 * 120;
  const body = Buffer.alloc(44 + samples, 128);
  body.write('RIFF', 0);
  body.writeUInt32LE(36 + samples, 4);
  body.write('WAVEfmt ', 8);
  body.writeUInt32LE(16, 16);
  body.writeUInt16LE(1, 20);
  body.writeUInt16LE(1, 22);
  body.writeUInt32LE(8000, 24);
  body.writeUInt32LE(8000, 28);
  body.writeUInt16LE(1, 32);
  body.writeUInt16LE(8, 34);
  body.write('data', 36);
  body.writeUInt32LE(samples, 40);
  return body;
}
export async function setupMusic(page: Page, skin = 'wechat', mode = 'light') {
  page.setDefaultTimeout(12000);
  page.setDefaultNavigationTimeout(30000);
  let phase: 'loading' | 'empty' | 'error' | 'success' = 'success';
  let release: (() => void) | undefined;
  let searchRequests = 0;
  let recommendationRequests = 0;
  let resolveRequests = 0;
  let resolutionHeld = false;
  let releaseResolution: (() => void) | undefined;
  let sentMessages = 0;
  let sendFailure = false;
  const audio = silentAudio();
  const fixture = await setupChatMenu(page, skin, mode, 'user', async () => {
    await page.route('**/api/chat/message/send', (route) => {
      const input = route.request().postDataJSON() as { content: string; clientMessageId: string };
      sentMessages++;
      if (sendFailure)
        return route.fulfill({ json: { code: 50001, message: '合成发送失败，请重试' } });
      return route.fulfill({
        json: {
          code: 0,
          data: {
            message: {
              id: String(1794441600000 + sentMessages),
              content: input.content,
              clientMessageId: input.clientMessageId,
              sender: { id: '123', name: '本人合成' },
              timestamp: 1794441600000 + sentMessages,
            },
          },
        },
      });
    });
    await page.route('**/api/third-party/music/**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/url')) {
        resolveRequests++;
        if (resolutionHeld)
          await new Promise<void>((done) => {
            releaseResolution = done;
          });
        return route.fulfill({
          json: { code: 0, data: `https://music.example.test/${url.searchParams.get('id')}.wav` },
        });
      }
      if (url.pathname.endsWith('/recommendations')) recommendationRequests++;
      else searchRequests++;
      if (phase === 'loading')
        await new Promise<void>((done) => {
          release = done;
        });
      if (phase === 'error')
        return route.fulfill({
          json: { code: 50001, message: '音乐服务尚未配置，请在后端 yml 填写密钥' },
        });
      const pageNumber = Number(url.searchParams.get('page') ?? 1);
      const data =
        phase === 'empty'
          ? []
          : Array.from({ length: pageNumber === 1 ? 20 : 2 }, (_, n) => ({
              id: String((pageNumber - 1) * 20 + n + 1),
              name: `合成歌曲${(pageNumber - 1) * 20 + n + 1}`,
              artist: '合成歌手与较长的专辑演唱者名称',
            }));
      return route.fulfill({ json: { code: 0, data } });
    });
    await page.route('https://music.example.test/**', (route) => {
      const range = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range ?? '');
      const start = Number(range?.[1] ?? 0);
      const end = range?.[2] ? Math.min(Number(range[2]), audio.length - 1) : audio.length - 1;
      return route.fulfill({
        status: range ? 206 : 200,
        contentType: 'audio/wav',
        body: audio.subarray(start, end + 1),
        headers: {
          'Accept-Ranges': 'bytes',
          ...(range ? { 'Content-Range': `bytes ${start}-${end}/${audio.length}` } : {}),
        },
      });
    });
  });
  cleanups.set(page, () => {
    release?.();
    releaseResolution?.();
    return fixture.dispose();
  });
  return {
    ...fixture,
    phase(value: typeof phase) {
      phase = value;
      if (value !== 'loading') release?.();
    },
    counts: () => ({ searchRequests, resolveRequests }),
    recommendationRequests: () => recommendationRequests,
    sends: () => sentMessages,
    failSending(value: boolean) {
      sendFailure = value;
    },
    holdResolution(value: boolean) {
      resolutionHeld = value;
      if (!value) releaseResolution?.();
    },
    async open() {
      await page.getByRole('button', { name: '音乐点歌', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: '音乐', exact: true });
      await expect(dialog.getByRole('textbox', { name: '搜索歌曲或歌手' })).toBeVisible();
      return dialog;
    },
  };
}
