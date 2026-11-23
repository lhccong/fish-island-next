import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupAdmin } from './admin-fixture';
import {
  fixtureAtlases,
  fixtureCards,
  fixturePools,
  setupPetCardCatalog,
} from './pet-card-catalog-fixture';
import { activate } from './pet-cards-flow';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`pet card admin ${skin.id} ${mode} ${width}`, async ({ page }, info) => {
        const mobile = width <= 760;
        await page.setViewportSize({ width, height: 844 });
        await setupAdmin(page, skin.id, mode);
        await setupPetCardCatalog(page);
        await page.route(`**/api/pet/cards/art/${fixtureAtlases[1]!.id}`, (route) =>
          route.fulfill({ status: 404 }),
        );
        let failCatalog = true;
        let failSave = true;
        let showCards = false;
        const fetchedPages: number[] = [];
        let saved: Record<string, unknown> = {};
        let savedPool: Record<string, unknown> = {};
        let uploaded = false;
        await page.route('**/api/admin/pet-cards/**', (route) => {
          const request = route.request();
          const url = new URL(request.url());
          const reply = (data: unknown) => route.fulfill({ json: { code: 0, data } });
          expect(request.headers()['test-session']).toBe('synthetic-value');
          if (url.pathname.endsWith('/pools')) {
            if (failCatalog) return route.fulfill({ status: 503 });
            if (request.method() === 'POST') {
              savedPool = request.postDataJSON() as Record<string, unknown>;
              return reply(true);
            }
            return reply(fixturePools);
          }
          if (url.pathname.endsWith('/atlases')) {
            if (request.method() === 'POST') {
              expect(request.headers()['content-type']).toContain('multipart/form-data; boundary=');
              expect(request.postDataBuffer()?.toString('latin1')).toContain('name="file"');
              uploaded = true;
              return reply(fixtureAtlases[0]);
            }
            return reply(fixtureAtlases);
          }
          if (request.method() === 'POST') {
            saved = request.postDataJSON() as Record<string, unknown>;
            return failSave
              ? route.fulfill({ json: { code: 40000, message: '测试保存失败' } })
              : reply(true);
          }
          const number = Number(url.searchParams.get('page'));
          fetchedPages.push(number);
          const items = showCards ? fixtureCards.slice((number - 1) * 20, number * 20) : [];
          return reply({ total: String(showCards ? fixtureCards.length : 0), items });
        });
        await page.goto('/admin/pet-cards', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('alert')).toContainText('管理服务暂不可用');
        failCatalog = false;
        await activate(page.getByRole('button', { name: '重试', exact: true }), mobile);
        await expect(page.getByText('暂无符合条件的卡牌。')).toBeVisible();
        showCards = true;
        await activate(page.getByRole('button', { name: '刷新', exact: true }), mobile);
        const list = page.getByRole('region', { name: '卡牌列表' });
        const radish = list.getByRole('img', { name: '拾贝萝卜插画' });
        const crab = list.getByRole('img', { name: '潮汐小蟹插画' });
        await expect(radish).toBeVisible();
        await expect(crab).toBeVisible();
        await expect(crab).toHaveAttribute('src', (await radish.getAttribute('src')) ?? '');
        const thumbnails = await Promise.all(
          [radish, crab].map((image) =>
            image.evaluate((el) => {
              const frame = el.parentElement!.getBoundingClientRect();
              return {
                width: frame.width,
                height: frame.height,
                left: (el as HTMLImageElement).style.left,
              };
            }),
          ),
        );
        expect(thumbnails).toEqual([
          { width: mobile ? 48 : 56, height: mobile ? 48 : 56, left: '0%' },
          { width: mobile ? 48 : 56, height: mobile ? 48 : 56, left: '-100%' },
        ]);
        const badgeColors = await list
          .locator('[data-card-grade]')
          .evaluateAll((badges) =>
            badges
              .slice(0, 10)
              .map(
                (badge) =>
                  `${getComputedStyle(badge).backgroundColor} ${getComputedStyle(badge).backgroundImage}`,
              ),
          );
        expect(new Set(badgeColors).size).toBe(5);
        if (
          skin.id === 'wechat' &&
          ((width === 1440 && mode === 'light') || (width === 390 && mode === 'dark'))
        ) {
          await page.screenshot({ path: info.outputPath('admin-card-thumbnails.png') });
        }
        const missing = list.getByRole('listitem').filter({ hasText: '寄信海鸥' });
        await missing.scrollIntoViewIfNeeded();
        await expect(missing.getByText('缺图', { exact: true })).toBeVisible();
        const edit = page.getByRole('button', { name: '编辑拾贝萝卜', exact: true });
        await activate(edit, mobile);
        const dialog = page.getByRole('dialog', { name: '编辑卡牌' });
        const form = dialog.getByRole('region', { name: '编辑卡牌表单' });
        await expect(form.getByRole('img', { name: /5 列 2 行/ })).toBeVisible();
        await expect(form.getByRole('combobox', { name: '图集格位' })).toHaveText('第 1 格');
        await activate(form.getByRole('combobox', { name: '图集格位' }), mobile);
        await activate(page.getByRole('option', { name: '第 10 格', exact: true }), mobile);
        if (
          skin.id === 'pixel-island' &&
          ((width === 375 && mode === 'dark') || (width === 1440 && mode === 'light'))
        ) {
          await form.getByRole('img', { name: /5 列 2 行/ }).scrollIntoViewIfNeeded();
          await dialog.screenshot({ path: info.outputPath('card-atlas-editor.png') });
        }
        await form.getByLabel('卡牌名称').fill('测试更新萝卜');
        await activate(dialog.getByRole('button', { name: '保存', exact: true }), mobile);
        await expect(dialog.getByRole('alert')).toHaveText('测试保存失败');
        await expect(form.getByLabel('卡牌名称')).toHaveValue('测试更新萝卜');
        const layout = await form.evaluate((el) => ({
          width: el.scrollWidth - el.clientWidth,
          gutter: getComputedStyle(el).paddingInlineEnd,
        }));
        expect(layout.width).toBeLessThanOrEqual(1);
        expect(layout.gutter).toBe(mobile ? '20px' : '24px');
        const scrollbar = form.locator('..').locator('[data-orientation="vertical"]');
        if (mobile) await expect(scrollbar).toHaveCSS('visibility', 'hidden');
        else {
          await form.hover();
          await expect(scrollbar).toHaveCSS('opacity', '1');
        }
        const membership = form.getByRole('switch', { name: '加入三国群英' });
        await activate(membership, mobile);
        await expect(membership).toBeChecked();
        failSave = false;
        await activate(dialog.getByRole('button', { name: '保存', exact: true }), mobile);
        await expect(page.getByText('配置已保存。')).toBeVisible();
        expect(saved).toMatchObject({
          id: 'radish',
          artKey: fixtureAtlases[0]!.id,
          artTile: 9,
          name: '测试更新萝卜',
          poolIds: ['island', 'kingdoms'],
        });
        await expect(dialog).toBeHidden();
        if (mode === 'dark') {
          const upload = page.getByRole('button', { name: '上传十卡图集' });
          await activate(upload, mobile);
          const atlas = page.getByRole('dialog', { name: '上传十卡图集' });
          await atlas.getByLabel('图集文件').setInputFiles('public/assets/pet/card-art.jpg');
          await activate(atlas.getByRole('button', { name: '上传', exact: true }), mobile);
          await expect(page.getByText('图集已上传，可在卡牌中选择格位。')).toBeVisible();
          expect(uploaded).toBe(true);
        }
        await list.locator('li').nth(19).scrollIntoViewIfNeeded();
        await expect.poll(() => fetchedPages.includes(2)).toBe(true);
        const picker = page.getByRole('combobox', { name: '筛选卡池' });
        await activate(picker, mobile);
        if (!mobile) {
          await page.keyboard.press('Escape');
          await expect(picker).toBeFocused();
          await activate(picker, false);
        }
        await activate(page.getByRole('option', { name: '海岛初遇', exact: true }), mobile);
        await activate(page.getByRole('button', { name: '配置此池' }), mobile);
        const pool = page.getByRole('dialog', { name: '配置卡池' });
        await pool.getByLabel('普通权重').fill('55');
        await activate(pool.getByRole('button', { name: '保存', exact: true }), mobile);
        await expect(pool).toBeHidden();
        expect(savedPool).toMatchObject({ id: 'island', version: 1, weights: { common: 55 } });
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
          width,
        );
      });
    }
