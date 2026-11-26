import { expect, test, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { petCardActivation } from './pet-challenges-fixture';
import { assertPetLayout, swipePetContent } from './pet-layout';

const portrait = '/assets/pet/villain-idle-still.webp';
const opponent = { petId: '18', name: '合成对手', avatar: portrait, health: 90 };
const profile = {
  ...opponent,
  petUrl: portrait,
  level: 56,
  hunger: 95,
  mood: 97,
  equipStats: { totalBaseHp: 4423, totalBaseAttack: 764, totalBaseDefense: 610, speed: 206 },
  equippedItems: Object.fromEntries(
    ['weapon', 'head', 'hand', 'necklace', 'foot', 'wing'].map((slot, index) => [
      slot,
      { id: String(index + 1), template: { id: '40', name: `合成装备 ${index + 1}` } },
    ]),
  ),
};
const showcaseDetails = [
  {
    card: { ...petCardActivation.card, stars: 3 },
    stats: { attack: 14, health: 35 },
    effect: {
      kind: 'effect',
      name: petCardActivation.effectName,
      turnOffset: 1,
      trigger: { kind: 'turnStart' },
      outcome: { kind: 'shield', maxHealthPercent: 20 },
    },
  },
  ...Array.from({ length: 5 }, (_, index) => ({
    card: {
      ...petCardActivation.card,
      id: `profile-card-${index}`,
      name: `合成卡片 ${index + 1}`,
      grade: 'common',
      stars: 5,
      artTile: index,
    },
    stats: { speed: 5 },
  })),
];

const modesAndWidths = ['light', 'dark'].flatMap((mode) =>
  [1440, 375, 390].map((width) => ({ mode, width })),
);
for (const skin of builtinSkins)
  for (const { mode, width } of modesAndWidths)
    test.describe(`${skin.id} ${mode} ${width}`, () => {
      const mobile = width <= 760;
      test.describe.configure({ timeout: 90_000 });
      test.use({ hasTouch: mobile, isMobile: mobile });
      test(`cards and duel from a chat user's companion profile`, async ({ page }, info) => {
        const activate = (button: Locator) => (mobile ? button.tap() : button.click());
        await page.setViewportSize({ width, height: mobile ? 844 : 900 });
        const fixture = await setupChatMenu(page, skin.id, mode);
        await page.route('**/api/user/get/vo?*', (route) =>
          route.fulfill({ json: { code: 0, data: { id: '456', userName: '合成岛友' } } }),
        );
        await page.route('**/api/follow/is-following?*', (route) =>
          route.fulfill({ json: { code: 0, data: false } }),
        );

        const profileLoading = Promise.withResolvers<void>();
        let profileRequests = 0;
        await page.route('**/api/pet/other?*', async (route) => {
          expect(new URL(route.request().url()).searchParams.get('otherUserId')).toBe('456');
          profileRequests++;
          if (profileRequests === 1) {
            await profileLoading.promise;
            return route.fulfill({ json: { code: 40000, message: '伙伴资料读取失败' } });
          }
          return route.fulfill({
            json: {
              code: 0,
              data:
                profileRequests === 2
                  ? null
                  : { ...profile, showcaseDetails: profileRequests === 3 ? [] : showcaseDetails },
            },
          });
        });

        const previewLoading = Promise.withResolvers<void>();
        const battleLoading = Promise.withResolvers<void>();
        let previews = 0;
        let submissions = 0;
        await page.route('**/api/pet/cards/art/*', (route) =>
          route.fulfill({ path: 'public/assets/pet/card-art.jpg' }),
        );
        await page.route('**/api/pet/battle/*?*', async (route) => {
          const url = new URL(route.request().url());
          expect(url.searchParams.get('opponentUserId')).toBe('456');
          if (url.pathname.endsWith('/info')) {
            previews++;
            if (previews === 1) {
              await previewLoading.promise;
              return route.fulfill({ json: { code: 40400, message: '您还没有宠物' } });
            }
            return route.fulfill({
              json: {
                code: 0,
                data: {
                  myPet: { ...opponent, petId: '17', name: '合成伙伴' },
                  opponentPet: {
                    ...opponent,
                    showcaseCards: [{ card: petCardActivation.card, stats: { health: 35 } }],
                  },
                },
              },
            });
          }
          expect(url.pathname).toBe('/api/pet/battle/start');
          submissions++;
          await battleLoading.promise;
          return route.fulfill({
            json: {
              code: 0,
              data: [
                {
                  attackerType: 'MY_PET',
                  roundNumber: 1,
                  damage: 90,
                  myPetRemainingHealth: 90,
                  opponentPetRemainingHealth: 0,
                },
              ],
            },
          });
        });

        fixture.push('9001', '合成切磋入口');
        await activate(page.getByRole('button', { name: '查看合成岛友的用户卡片' }));
        const userCard = page.getByRole('dialog', { name: '用户卡片', exact: true });
        const petLink = userCard.getByRole('button', { name: '宠物', exact: true });
        const pet = page.getByRole('dialog', { name: '伙伴资料', exact: true });
        const openDuel = pet.getByRole('button', { name: '宠物切磋', exact: true });
        const viewport = pet.getByRole('region', { name: '伙伴资料内容' });
        await activate(petLink);
        const loading = pet.getByRole('status').filter({ hasText: '正在整理营地资料' });
        await expect(loading.locator('svg')).toBeVisible();
        const contentBox = (await viewport.boundingBox())!;
        const indicatorBox = (await loading.boundingBox())!;
        expect(
          Math.abs(
            indicatorBox.y + indicatorBox.height / 2 - (contentBox.y + contentBox.height / 2),
          ),
        ).toBeLessThan(12);
        await expect(openDuel).toHaveCount(0);
        profileLoading.resolve();
        await expect(pet.getByRole('alert')).toContainText('伙伴资料读取失败');
        await assertPetLayout(page);
        await activate(pet.getByRole('button', { name: '重试' }));
        await expect(pet.getByText('这位岛友还没有领养伙伴。')).toBeVisible();
        await expect(openDuel).toHaveCount(0);
        await assertPetLayout(page);
        await activate(pet.getByRole('button', { name: '关闭面板' }));
        await expect(petLink).toBeFocused();
        await activate(petLink);
        await expect(pet.getByText('尚未上架卡片。')).toBeVisible();
        await assertPetLayout(page);
        await activate(pet.getByRole('button', { name: '关闭面板' }));
        await expect(petLink).toBeFocused();
        await activate(petLink);
        await expect(openDuel).toBeVisible();
        expect((await openDuel.boundingBox())!.height).toBe(mobile ? 44 : 32);
        expect(previews).toBe(0);
        await assertPetLayout(page);
        const scrollbar = pet.locator('[data-orientation="vertical"][data-state]');
        const cards = pet.getByRole('list', { name: '上架卡片' });
        await expect(cards.getByRole('listitem')).toHaveCount(6);
        const first = cards.getByRole('button', { name: '查看潮月守卫效果，3 星' });
        const last = cards.getByRole('button', { name: '查看合成卡片 5效果，5 星' });
        await expect(first.locator('svg.lucide-star')).toHaveCount(3);
        await expect(last.locator('svg.lucide-star')).toHaveCount(5);
        await expect(first.locator('img')).toBeVisible();
        const headings = await pet.getByRole('heading', { level: 3 }).evaluateAll((elements) =>
          elements.map((element) => {
            const { x, y } = element.getBoundingClientRect();
            return { x, y };
          }),
        );
        if (mobile) {
          expect(headings.map(({ x }) => x)).toEqual(Array(3).fill(headings[0]!.x));
          expect(headings[2]!.y).toBeGreaterThan(headings[1]!.y);
          expect(headings[1]!.y).toBeGreaterThan(headings[0]!.y);
          expect((await first.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        } else {
          expect(headings.map(({ y }) => y)).toEqual(Array(3).fill(headings[0]!.y));
          expect(headings[2]!.x).toBeGreaterThan(headings[1]!.x);
          expect(headings[1]!.x).toBeGreaterThan(headings[0]!.x);
          await first.scrollIntoViewIfNeeded();
          await first.hover();
          await expect(first).toHaveCSS('outline-style', 'none');
          await first.focus();
        }
        if (mobile) {
          await swipePetContent(page, viewport);
          await expect
            .poll(() => viewport.evaluate((element) => element.scrollTop))
            .toBeGreaterThan(0);
          await first.tap();
        } else await page.keyboard.press('Enter');
        const details = page.getByRole('dialog', { name: '潮月守卫', exact: true });
        await expect(details).toContainText('史诗 · 3 星');
        await expect(details).toContainText('攻击 +14');
        await expect(details).toContainText('生命 +35');
        await expect(details).toContainText('潮月护体');
        await expect(details).toContainText('最大生命 20% 的护盾');
        await assertPetLayout(page);
        if (skin.id === 'wechat')
          await page.screenshot({ path: info.outputPath('card-details.png') });
        if (mobile) await details.getByRole('button', { name: '关闭卡片详情' }).tap();
        else await page.keyboard.press('Escape');
        await expect(details).toHaveCount(0);
        await expect(first).toBeFocused();
        if (!mobile)
          expect(
            await first.evaluate((element) => getComputedStyle(element).outlineStyle),
          ).not.toBe('none');
        await assertPetLayout(page);
        if (skin.id === 'wechat')
          await page.screenshot({ path: info.outputPath('card-column.png') });

        await viewport.press('End');
        await expect(last).toBeInViewport();
        await expect
          .poll(() => viewport.evaluate((element) => element.scrollTop))
          .toBeGreaterThan(0);
        if (mobile) await expect(scrollbar).toBeHidden();
        else {
          await expect(scrollbar).toBeVisible();
          await expect(scrollbar).toHaveCSS('opacity', '1');
        }
        await activate(last);
        const common = page.getByRole('dialog', { name: '合成卡片 5', exact: true });
        await expect(common).toContainText('速度 +5');
        await expect(common).toContainText('无战斗被动');
        await activate(common.getByRole('button', { name: '关闭卡片详情' }));
        await expect(last).toBeFocused();
        await viewport.press('Home');
        await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBe(0);

        if (mobile) await openDuel.tap();
        else {
          await openDuel.focus();
          await page.keyboard.press('Enter');
        }
        const duel = page.getByRole('dialog', { name: '宠物切磋', exact: true });
        await expect(duel.getByRole('status')).toContainText('正在整理营地资料');
        await assertPetLayout(page);
        previewLoading.resolve();
        await expect(duel.getByRole('alert')).toContainText('您还没有宠物');
        expect(submissions).toBe(0);
        await assertPetLayout(page);
        await activate(duel.getByRole('button', { name: '重试' }));
        await expect(duel.getByRole('region', { name: `${opponent.name}状态` })).toBeVisible();
        await expect(duel.getByRole('list', { name: '合成伙伴出战卡牌' })).toHaveCount(0);
        const card = duel.getByRole('button', { name: '查看潮月守卫效果' });
        if (mobile) {
          await card.tap();
          const effect = page.getByRole('dialog', { name: '潮月守卫效果' });
          await expect(effect).toContainText('生命 +35');
          await effect.getByRole('button', { name: '关闭潮月守卫效果' }).tap();
          await expect(card).toBeFocused();
        } else {
          await card.hover();
          const effect = page.getByRole('tooltip', { name: '潮月守卫效果' });
          await expect(effect).toContainText('生命 +35');
          await page.keyboard.press('Escape');
          await expect(effect).toHaveCount(0);
        }
        await assertPetLayout(page);
        expect(submissions).toBe(0);
        await activate(duel.getByRole('button', { name: '开始挑战' }));
        try {
          await expect(duel.getByRole('button', { name: '正在提交挑战…' })).toBeDisabled();
        } finally {
          battleLoading.resolve();
        }
        await expect(duel.getByText('挑战胜利', { exact: true })).toBeVisible();
        await activate(duel.getByRole('button', { name: '重播战斗' }));
        await expect(duel.getByText('挑战胜利', { exact: true })).toBeVisible();
        expect(submissions).toBe(1);

        if (mobile) await duel.getByRole('button', { name: '关闭面板' }).tap();
        else await page.keyboard.press('Escape');
        await expect(duel).toHaveCount(0);
        await expect(openDuel).toBeFocused();
        await expect(page).toHaveURL(/\/chat$/);
        expect(profileRequests).toBe(4);
        expect(previews).toBe(2);
        expect(fixture.stats().connections).toBe(1);
      });
    });
