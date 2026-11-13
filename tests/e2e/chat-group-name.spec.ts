import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

test.setTimeout(60_000);
const preferenceKey = 'fish-island:chat:public-group-name';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: local group name edits and survives reload`, async ({
      page,
    }, info) => {
      await page.addInitScript(
        ({ skin, mode }) => {
          localStorage.setItem('fish-island:skin', skin);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { skin: skin.id, mode },
      );
      await page.route('**/api/**', (route) => route.abort());
      await page.route('**/api/hot/list', (route) =>
        route.fulfill({ json: { code: 0, data: [] } }),
      );
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
      let phase = 'loading';
      let requests = 0;
      let release!: () => void;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route('**/api/chat/online/user', async (route) => {
        requests++;
        if (phase === 'loading') await pending;
        await route.fulfill({
          status: phase === 'error' ? 503 : 200,
          json: {
            code: 0,
            data:
              phase === 'empty'
                ? []
                : Array.from({ length: 16 }, (_, i) => ({
                    id: String(i),
                    name: `合成成员${i}`,
                    avatar: null,
                  })),
          },
        });
      });
      const touch = page.viewportSize()!.width <= 760;
      const activate = async (button: ReturnType<typeof page.getByRole>) =>
        touch ? button.tap() : button.click();
      const checkLayout = async () => {
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        const editor = page.getByRole('region', { name: '本地群聊名称' });
        const geometry = await editor.evaluate((element) => {
          const box = element.getBoundingClientRect();
          return {
            x: box.x,
            right: box.right,
            overflow: element.scrollWidth > element.clientWidth,
          };
        });
        expect(geometry.x).toBeGreaterThanOrEqual(0);
        expect(geometry.right).toBeLessThanOrEqual(page.viewportSize()!.width);
        expect(geometry.overflow).toBe(false);
      };
      await page.goto('/chat');
      await page
        .getByRole('textbox', { name: '账号或邮箱', exact: true })
        .fill('synthetic-account');
      await page.getByLabel('密码', { exact: true }).fill('synthetic-password');
      await page.getByRole('button', { name: '登录', exact: true }).click();
      const heading = page.getByRole('heading', { level: 1, name: '鱼岛群聊' });
      await expect(heading).toBeVisible();
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await draft.fill('保留合成草稿');
      await activate(page.getByRole('button', { name: '群聊详情', exact: true }));
      const panel = page.getByRole('complementary', { name: '在线成员', exact: true });
      await expect(panel.getByText('正在获取在线成员…', { exact: true })).toBeVisible();
      const edit = panel.getByRole('button', { name: '修改群聊名称', exact: true });
      await expect(edit).toHaveText('');
      await expect(edit).toHaveAttribute('title', '修改群聊名称');
      await expect(panel.getByText('仅保存在当前浏览器，不影响其他成员')).toHaveCount(0);
      await expect(panel.getByText('关于在线列表')).toHaveCount(0);
      await expect(panel.getByText('仅显示最近获取的成员，不代表群成员总数。')).toHaveCount(0);
      const editBounds = (await edit.boundingBox())!;
      expect(editBounds.width).toBeGreaterThanOrEqual(44);
      expect(editBounds.height).toBeGreaterThanOrEqual(44);
      await activate(edit);
      const input = panel.getByRole('textbox', { name: '新群聊名称', exact: true });
      await expect(input).toBeFocused();
      await input.fill('尚未保存');
      await input.press('Escape');
      await expect(edit).toBeFocused();
      await expect(panel).toBeVisible();
      await expect(heading).toBeVisible();
      await activate(edit);
      await input.fill('   ');
      await activate(panel.getByRole('button', { name: '保存', exact: true }));
      await expect(panel.getByRole('alert')).toHaveText('请输入群聊名称');
      await input.fill('鱼'.repeat(31));
      await activate(panel.getByRole('button', { name: '保存', exact: true }));
      await expect(panel.getByRole('alert')).toHaveText('群聊名称最多 30 个字符');
      const name = '鱼'.repeat(30);
      await input.fill(` ${name} `);
      await checkLayout();
      await page.screenshot({ path: info.outputPath('name-loading-editor.png') });
      await page.evaluate((key) => {
        const original = Storage.prototype.setItem;
        localStorage.setItem('synthetic-name-write-failure', 'yes');
        Storage.prototype.setItem = function (name, value) {
          if (name === key && localStorage.getItem('synthetic-name-write-failure') === 'yes')
            throw new DOMException('Synthetic storage failure', 'QuotaExceededError');
          return original.call(this, name, value);
        };
      }, preferenceKey);
      await activate(panel.getByRole('button', { name: '保存', exact: true }));
      await expect(panel.getByRole('alert')).toContainText('本地保存失败');
      await expect(heading).toBeVisible();
      await expect(input).toHaveValue(` ${name} `);
      await checkLayout();
      await page.screenshot({ path: info.outputPath('name-save-error.png') });
      await page.evaluate(() => localStorage.removeItem('synthetic-name-write-failure'));
      await activate(panel.getByRole('button', { name: '保存', exact: true }));
      await expect(page.getByRole('heading', { name, level: 1, exact: true })).toBeVisible();
      await expect(panel.getByText('已保存到本地', { exact: true })).toBeVisible();
      await expect(edit).toBeFocused();
      expect(await page.evaluate((key) => localStorage.getItem(key), preferenceKey)).toBe(name);
      expect(requests).toBe(1);
      phase = 'success';
      release();
      await expect(panel.getByRole('listitem')).toHaveCount(16);
      await checkLayout();
      await page.screenshot({ path: info.outputPath('name-success.png') });
      for (const state of ['error', 'empty'] as const) {
        phase = state;
        await activate(panel.getByRole('button', { name: '刷新', exact: true }));
        if (state === 'error')
          await expect(panel.getByRole('alert')).toContainText('在线成员加载失败');
        else
          await expect(
            panel.getByText('暂无在线成员，可稍后刷新查看。', { exact: true }),
          ).toBeVisible();
        await activate(edit);
        await expect(input).toHaveValue(name);
        await checkLayout();
        await activate(panel.getByRole('button', { name: '取消', exact: true }));
      }
      await activate(panel.getByRole('button', { name: '关闭在线列表' }));
      await expect(draft).toHaveText('保留合成草稿');
      if (!touch)
        await expect(
          page.getByRole('complementary', { name: '聊天会话' }).getByText(name, { exact: true }),
        ).toBeVisible();
      await page.reload();
      await expect(page.getByRole('heading', { name, level: 1, exact: true })).toBeVisible();
      await expect.poll(() => requests).toBe(4);
      await activate(page.getByRole('button', { name: '群聊详情', exact: true }));
      await activate(edit);
      await expect(input).toHaveValue(name);
    });
  }
