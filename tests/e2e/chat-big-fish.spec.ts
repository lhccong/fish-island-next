import { expect, test, type WebSocketRoute } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { mockBigFishEmoticons } from './chat-big-fish-emoticon-fixture';

test.setTimeout(60000);
test.use({ serviceWorkers: 'block' });

type FishEmoticon = { bigFishEmoticonUrl?: string; bigFishEmoticonKeyword?: string };
const fishMessage = (id: string, content: string, emoticon?: FishEmoticon) => ({
  id,
  roomId: '-1',
  bigFish: true,
  content,
  ...emoticon,
  sender: { id: '-2', name: '大肥鱼' },
  timestamp: Date.now(),
});

for (const skin of builtinSkins) {
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode} animates big fish in the message timeline`, async ({ page }, info) => {
      const mobile = info.project.name.startsWith('mobile');
      let socket: WebSocketRoute | undefined;
      let connections = 0;
      let sent = '';
      let spriteUnavailable = false;
      let releaseSprite!: () => void;
      const spriteReady = new Promise<void>((resolve) => {
        releaseSprite = resolve;
      });
      const { searches, stickerUrls, releaseSearch } = await mockBigFishEmoticons(page);
      const saved = new Map<string, ReturnType<typeof fishMessage>>();
      await page.addInitScript(
        ({ skin, mode }) => {
          localStorage.setItem('fish-island:skin', skin);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { skin: skin.id, mode },
      );
      await page.routeWebSocket(/\/ws\//, (ws) => {
        socket = ws;
        connections++;
      });
      await page.route('**/api/**', (route) => route.fulfill({ json: { code: 0, data: [] } }));
      await page.route('**/assets/chat/big-fish.webp', async (route) => {
        await spriteReady;
        if (spriteUnavailable) await route.abort();
        else await route.fulfill({ path: 'public/assets/chat/big-fish.webp' });
      });
      await page.route('**/api/chat/message/page/vo', (route) =>
        route.fulfill({
          json: {
            code: 0,
            data: {
              records: [...saved.values()]
                .reverse()
                .map((message) => ({ messageWrapper: { message } })),
            },
          },
        }),
      );
      await page.route('**/api/chat/message/send', (route) => {
        const input = route.request().postDataJSON();
        sent = input.content;
        return route.fulfill({
          json: {
            code: 0,
            data: {
              message: {
                id: 'reply',
                clientMessageId: input.clientMessageId,
                content: sent,
                sender: { id: '123', name: '合成岛友' },
                timestamp: Date.now(),
              },
            },
          },
        });
      });
      await page.route('**/api/user/**', (route) =>
        route.fulfill({
          json: {
            code: 0,
            data: {
              id: '123',
              userName: '合成岛友',
              userRole: 'user',
              saTokenInfo: { tokenName: 'test-session', tokenValue: 'synthetic-value' },
            },
          },
        }),
      );
      await page.goto('/chat', { waitUntil: 'domcontentloaded' });
      await page
        .getByRole('textbox', { name: '账号或邮箱', exact: true })
        .fill('synthetic-account');
      await page.getByLabel('密码', { exact: true }).fill('synthetic-password');
      await page.getByRole('button', { name: '登录', exact: true }).click();
      await expect.poll(() => Boolean(socket)).toBe(true);
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await draft.fill('肥鱼在吗？');
      const send = page.getByRole('button', { name: '发送', exact: true });
      if (mobile) await send.tap();
      else await send.click();
      await expect.poll(() => sent).toBe('肥鱼在吗？');
      await draft.fill('留在输入框的文字');
      const popup = page.getByRole('complementary', { name: '大肥鱼', exact: true });
      const composer = page.getByRole('region', { name: '群聊输入区' });
      const history = page.getByRole('region', { name: '群聊实时消息', exact: true });
      const post = (
        id: string,
        status: string,
        text: string,
        roomId = '-1',
        emoticon?: FishEmoticon,
      ) => {
        const message =
          status === 'speech'
            ? (saved.get(id) ?? fishMessage(`2600${saved.size}`, text, emoticon))
            : undefined;
        if (message && roomId === '-1') saved.set(id, message);
        socket!.send(
          JSON.stringify({ type: 'bigFish', data: { id, status, text, roomId, message } }),
        );
      };

      post('foreign', 'speech', '不要显示', '42');
      post('reply', 'thinking', '');
      const thinking = composer.getByRole('status').filter({ hasText: '大肥鱼在想' });
      await expect(thinking.locator('svg')).toBeVisible();
      await expect(history.getByText('不要显示', { exact: true })).toHaveCount(0);
      await expect(popup).toHaveCount(0);
      socket!.send(
        JSON.stringify({
          type: 'chat',
          data: {
            message: {
              id: '25999',
              sender: { id: '456', name: '对齐岛友' },
              content: '看看头像和名字。',
              timestamp: Date.now(),
            },
          },
        }),
      );
      const reply = '来啦，刚才在摸鱼！';
      post('reply', 'speech', reply);
      const first = history.locator('[data-message-kind="big-fish"]').filter({ hasText: reply });
      await expect(first).toHaveCount(1);
      const avatarMention = first.getByRole('button', { name: '通过头像 @大肥鱼' });
      const nameMention = first.getByRole('button', { name: '@大肥鱼', exact: true });
      await expect(avatarMention.locator('[data-image="loading"]')).toBeVisible();
      if (mobile) await avatarMention.tap();
      else await avatarMention.click();
      await expect(draft).toHaveText('留在输入框的文字 @大肥鱼');
      await expect(draft).toBeFocused();
      await draft.fill('留在输入框的文字');
      releaseSprite();
      const sprite = first.locator('[data-image="ready"]');
      const image = sprite.locator('img');
      await expect(sprite).toBeVisible({ timeout: 15000 });
      await expect(image).toHaveCSS('animation-timing-function', 'steps(5)');
      await expect(image).toHaveCSS('animation-iteration-count', '2');
      await expect(thinking).toHaveCount(0);
      const avatarWidth = skin.id === 'wps' ? (mobile ? 52 : 60) : mobile ? 60 : 64;
      await expect(sprite).toHaveCSS('width', `${avatarWidth}px`);
      const regularName = history.getByRole('button', { name: '查看对齐岛友的用户卡片' });
      await expect(regularName).toBeVisible();
      const regularNameBounds = (await regularName.boundingBox())!;
      const fishNameBounds = (await nameMention.boundingBox())!;
      expect(Math.abs(regularNameBounds.x - fishNameBounds.x)).toBeLessThan(1);
      const fishBubble =
        skin.id === 'wps'
          ? first.getByText(reply, { exact: true })
          : first.getByRole('group', { name: '大肥鱼的消息' });
      await expect(fishBubble).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      if (skin.id === 'wps') {
        const fishAvatar = (await sprite.boundingBox())!;
        const bubbleBounds = (await fishBubble.boundingBox())!;
        expect(Math.abs(fishAvatar.y - bubbleBounds.y)).toBeLessThan(1);
      }
      if (skin.id !== 'wps') {
        const normalBubble = history.getByRole('group', { name: '对齐岛友的消息' });
        await expect(fishBubble).toHaveCSS(
          'background-color',
          await normalBubble.evaluate((node) => getComputedStyle(node).backgroundColor),
        );
        const ordinaryAvatar = (await history
          .getByRole('button', { name: '@对齐岛友' })
          .boundingBox())!;
        const fishAvatar = (await sprite.boundingBox())!;
        expect(
          Math.abs(
            ordinaryAvatar.x + ordinaryAvatar.width / 2 - fishAvatar.x - fishAvatar.width / 2,
          ),
        ).toBeLessThan(1);
        expect(Math.abs(fishAvatar.y - fishNameBounds.y)).toBeLessThan(3);
      }
      await expect(draft).toHaveText('留在输入框的文字');
      if (mobile) {
        expect((await nameMention.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        expect((await avatarMention.boundingBox())!.width).toBeGreaterThanOrEqual(44);
        expect((await avatarMention.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        await nameMention.tap();
      } else {
        await nameMention.click();
      }
      await expect(draft).toHaveText('留在输入框的文字 @大肥鱼');
      await expect(draft).toBeFocused();
      if (!mobile) {
        await nameMention.press('Space');
        await expect(draft).toHaveText('留在输入框的文字 @大肥鱼 @大肥鱼');
        await expect(draft).toBeFocused();
      }
      await expect(popup).toHaveCount(0);
      post('reply', 'thinking', '');
      post('reply', 'speech', reply);
      post('error', 'error', '大肥鱼没能回复，请稍后再试。');
      await expect(composer.getByText('大肥鱼没能回复，请稍后再试。')).toBeVisible();
      await expect(thinking).toHaveCount(0);
      await expect(first).toHaveCount(1);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(image).toHaveCSS('animation-name', 'none');
      post('empty-search', 'speech', '这句没有合适的图。', '-1', {
        bigFishEmoticonKeyword: '无语',
      });
      post('failed-search', 'speech', '这句仍会显示。', '-1', { bigFishEmoticonKeyword: '震惊' });
      for (const text of ['这句没有合适的图。', '这句仍会显示。']) {
        const row = history.locator('[data-message-kind="big-fish"]').filter({ hasText: text });
        await expect(row).toBeVisible();
        await expect(row.getByRole('status')).toHaveCount(0);
        await expect(row.getByRole('button', { name: '放大聊天图片' })).toHaveCount(0);
      }
      await expect.poll(() => searches.slice().sort()).toEqual(['无语表情', '震惊表情'].sort());
      post('interjection', 'speech', '肥鱼偶尔接一句。', '-1', { bigFishEmoticonKeyword: '开心' });
      const stickerRow = history
        .locator('[data-message-kind="big-fish"]')
        .filter({ hasText: '肥鱼偶尔接一句。' });
      const searchStatus = stickerRow.getByRole('status').filter({ hasText: '查找表情包' });
      await expect(searchStatus.locator('svg')).toBeVisible();
      releaseSearch();
      const savedSticker = stickerRow.locator('[data-image-state="ready"] img');
      await expect(savedSticker).toBeVisible();
      const chosenSticker = (await savedSticker.getAttribute('src'))!;
      expect(stickerUrls).toContain(chosenSticker);
      post('interjection', 'speech', '肥鱼偶尔接一句。');
      await expect(savedSticker).toHaveCount(1);
      expect(searches.filter((keyword) => keyword === '开心表情')).toHaveLength(1);
      const longText = '接着说，我听着呢。'.repeat(15);
      post('long', 'speech', longText);
      const line = history
        .getByRole('group', { name: '大肥鱼的消息' })
        .filter({ hasText: longText });
      const viewport = history.getByRole('region', { name: '群聊消息区', exact: true });
      await expect
        .poll(async () => {
          await viewport.evaluate((node) => node.scrollTo({ top: node.scrollHeight }));
          return line.count();
        })
        .toBe(1);
      await expect(line).toBeVisible();
      expect(
        await line.evaluate((node) => node.scrollWidth - node.clientWidth),
      ).toBeLessThanOrEqual(1);
      expect(await page.locator('body').evaluate((body) => body.scrollWidth)).toBeLessThanOrEqual(
        page.viewportSize()!.width,
      );
      expect(connections).toBe(1);

      spriteUnavailable = true;
      await page.reload({ waitUntil: 'domcontentloaded' });
      const historicalRow = history
        .locator('[data-message-kind="big-fish"]')
        .filter({ hasText: '接着说，我听着呢。' });
      const historicalAvatar = historicalRow.getByRole('button', { name: '通过头像 @大肥鱼' });
      await expect(historicalAvatar.locator('[data-image="error"]')).toBeVisible();
      if (mobile) await historicalAvatar.tap();
      else await historicalAvatar.click();
      await expect(draft).toHaveText('@大肥鱼');
      await expect(draft).toBeFocused();
      await expect(popup).toHaveCount(0);
      await expect(savedSticker).toBeVisible();
      await expect(savedSticker).toHaveAttribute('src', chosenSticker);

      spriteUnavailable = false;
      await page.goto('/chat/mini', { waitUntil: 'domcontentloaded' });
      await expect(historicalRow.locator('[data-image="ready"]')).toHaveCSS('width', '40px');
      await expect(historicalRow.locator('img')).toHaveCSS('animation-name', 'none');
      const compactName = historicalRow.getByRole('button', { name: '@大肥鱼', exact: true });
      if (mobile) await compactName.tap();
      else await compactName.click();
      await expect(draft).toHaveText('@大肥鱼');
      await expect(draft).toBeFocused();
      const expand = stickerRow.getByRole('button', { name: '展开单元格图片' });
      if (mobile) await expand.tap();
      else await expand.click();
      await expect(savedSticker).toBeVisible();
      await expect(popup).toHaveCount(0);
    });
  }
}
