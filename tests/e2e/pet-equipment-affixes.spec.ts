import { expect, test, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupPet } from './pet-fixture';
import { assertPetLayout } from './pet-layout';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: view equipped affixes for either companion`, async ({
        page,
      }, info) => {
        const mobile = width <= 760;
        await page.setViewportSize({ width, height: mobile ? 844 : 1000 });
        const state = await setupPet(page, skin.id, mode);
        await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
        await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
        const activate = (locator: Locator) => (mobile ? locator.tap() : locator.click());
        const requests: string[] = [];
        let status: 'error' | 'empty' | 'ready' = 'error';
        let release: (() => void) | undefined;
        await page.route('**/api/pet/forge/list?*', async (route) => {
          const petId = new URL(route.request().url()).searchParams.get('petId')!;
          expect(route.request().method()).toBe('GET');
          requests.push(petId);
          if (status === 'error') {
            await new Promise<void>((resolve) => {
              release = resolve;
            });
            return route.fulfill({ json: { code: 40000, message: '词条读取失败' } });
          }
          const records = [{ equipSlot: 1, entry1: { attr: 'hp', value: 99, grade: 2 } }];
          const equipped =
            petId === '17'
              ? { equipSlot: 2, equipLevel: 3, entry1: { attr: 'attack', value: 18, grade: 3 } }
              : {
                  equipSlot: '8',
                  equipLevel: 7,
                  entry1: { attr: 'critRate', value: 0.0192, grade: '5', locked: true },
                  entry2: { attr: 'defense', value: 52, grade: 4, locked: true },
                  entry3: { attr: 'antiLifesteal', value: 0.025, grade: 3, locked: true },
                  entry4: { attr: 'speed', value: 4, grade: 2, locked: true },
                };
          return route.fulfill({
            json: { code: 0, data: status === 'ready' ? [records[0], equipped] : records },
          });
        });

        const inventory = page.getByRole('complementary', { name: '营地行囊' });
        await activate(inventory.getByRole('button', { name: '穿戴', exact: true }));
        const mine = page.getByRole('button', { name: '手部：苔纹护腕', exact: true });
        await expect(mine).toBeEnabled();
        expect(requests).toEqual([]);
        await mine.focus();
        await expect(mine).toBeFocused();
        if (mobile) await activate(mine);
        else await page.keyboard.press('Enter');
        const ownDetail = page.getByRole('dialog', { name: '苔纹护腕', exact: true });
        await expect(ownDetail.getByRole('status')).toHaveText('正在整理营地资料…');
        await assertPetLayout(page);
        await expect.poll(() => Boolean(release)).toBe(true);
        release!();
        await expect(ownDetail.getByRole('alert')).toContainText('词条读取失败');
        await assertPetLayout(page);
        status = 'empty';
        await activate(ownDetail.getByRole('button', { name: '重试' }));
        await expect(ownDetail.getByText('此部位暂无词条。')).toBeVisible();
        await assertPetLayout(page);
        await page.keyboard.press('Escape');
        await expect(mine).toBeFocused();

        status = 'ready';
        await activate(page.getByRole('button', { name: '行囊', exact: true }));
        const bag = page.getByRole('dialog', { name: '行囊', exact: true });
        const equipped = bag.getByRole('button', { name: '查看苔纹护腕词条' });
        await activate(equipped);
        await expect(ownDetail.getByText('强化 +3', { exact: true })).toBeVisible();
        await expect(ownDetail.getByText('+18', { exact: true })).toBeVisible();
        await expect(ownDetail.getByLabel('词条品质：紫')).toBeVisible();
        await assertPetLayout(page);
        await activate(ownDetail.getByRole('button', { name: '关闭装备词条' }));
        await expect(equipped).toBeFocused();
        await activate(bag.getByRole('button', { name: '关闭面板' }));

        await page.route('**/api/pet/other?*', (route) => {
          const item = state.pet.equippedItems.hand!;
          return route.fulfill({
            json: {
              code: 0,
              data: {
                ...state.pet,
                petId: '18',
                userId: '124',
                name: '栗栗',
                equippedItems: {
                  wings: {
                    ...item,
                    id: '503',
                    template: { ...item.template, name: '星羽', equipSlot: 'wings' },
                  },
                },
              },
            },
          });
        });
        await activate(page.getByRole('button', { name: '挑战', exact: true }));
        await activate(page.getByRole('button', { name: '资料', exact: true }));
        const profile = page.getByRole('dialog', { name: '伙伴资料', exact: true });
        const other = profile.getByRole('button', { name: '羽翼：星羽', exact: true });
        await expect(profile.getByRole('button', { name: '手部：未装备' })).toBeDisabled();
        await activate(other);
        const detail = page.getByRole('dialog', { name: '星羽', exact: true });
        await expect(detail.getByText('强化 +7', { exact: true })).toBeVisible();
        await expect(detail.getByText('+1.92%', { exact: true })).toBeVisible();
        await expect(detail.getByLabel('词条品质：红')).toBeVisible();
        await expect(detail.getByText('已锁定', { exact: true })).toHaveCount(4);
        await expect(detail.getByRole('button')).toHaveCount(1);
        await expect(detail.getByText('+4', { exact: true })).toBeInViewport();
        await assertPetLayout(page);

        if (skin.id === 'wechat') await page.screenshot({ path: info.outputPath('equipment.png') });
        // A short viewport makes all four affixes scroll without synthetic extra rows.
        await page.setViewportSize({ width, height: 420 });
        const viewport = detail.getByRole('region', { name: '装备词条', exact: true });
        await viewport.hover();
        if (mobile) {
          const box = (await viewport.boundingBox())!;
          const cdp = await page.context().newCDPSession(page);
          const x = box.x + 32;
          const y = box.y + box.height * 0.8;
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x, y }],
          });
          for (let step = 1; step <= 7; step++)
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchMove',
              touchPoints: [{ x, y: y - step * 22 }],
            });
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await cdp.detach();
        } else await page.mouse.wheel(0, 300);
        await expect
          .poll(() => viewport.evaluate((element) => element.scrollTop))
          .toBeGreaterThan(0);
        await expect(detail.getByText('+4', { exact: true })).toBeInViewport();
        await expect(viewport.locator('..').locator('[data-orientation="vertical"]')).toHaveCSS(
          'visibility',
          mobile ? 'hidden' : 'visible',
        );
        await assertPetLayout(page);
        await page.keyboard.press('Escape');
        await expect(detail).toBeHidden();
        await expect(other).toBeFocused();
        await page.setViewportSize({ width, height: mobile ? 844 : 1000 });
        const row = profile.getByRole('button', { name: '查看星羽词条' });
        await activate(row);
        await expect(detail.getByText('+1.92%', { exact: true })).toBeVisible();
        await activate(detail.getByRole('button', { name: '关闭装备词条' }));
        await expect(row).toBeFocused();
        expect(requests).toEqual(['17', '17', '17', '18', '18']);
        expect(state.actions).toEqual(['equip']);
      });
    }
