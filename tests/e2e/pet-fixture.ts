import { expect, type Page } from '@playwright/test';
import { createActivityFixture } from './pet-activities-fixture';

const portrait = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 130"><ellipse cx="60" cy="116" rx="32" ry="8" fill="#274d3a" opacity=".15"/><path d="M29 66 23 22q22 2 29 22 14-13 31-8L105 8q10 29-7 52 18 44-15 55H42Q14 104 29 66" fill="#e4be79" stroke="#775c3a" stroke-width="3"/><path d="M49 90q15-16 28 0v20H49" fill="#fff1cd"/><circle cx="45" cy="68" r="4" fill="#293d36"/><circle cx="79" cy="68" r="4" fill="#293d36"/><path d="m56 80 5 4 6-4M29 24l8 27M102 14 90 43" fill="none" stroke="#775c3a" stroke-width="3"/><path d="M53 41q-10-23 7-32 16 14 7 29" fill="#689f68" stroke="#446b48" stroke-width="3"/></svg>`;
export async function setupPet(page: Page, skin: string, mode: string) {
  const activity = createActivityFixture();
  const template = {
    id: '40',
    name: '苔纹护腕',
    icon: 'https://camp.test/item.svg',
    description: '由营地工匠编织的护腕。',
    category: 'equipment',
    equipSlot: 'hand',
    rarity: 2,
    baseAttack: 8,
    baseDefense: 4,
    purchasePoint: 20,
  };
  const item = { id: '501', quantity: 1, enhanceLevel: 0, template };
  const pet = {
    petId: '17',
    userId: '123',
    name: '小苔',
    level: 8,
    exp: 135,
    hunger: 60,
    mood: 75,
    petUrl: 'https://camp.test/companion.svg',
    equipStats: {
      totalBaseHp: 120,
      totalBaseAttack: 20,
      totalBaseDefense: 12,
      speed: 10,
      critRate: 5,
      dodgeRate: 2,
      blockRate: 3,
      comboRate: 2,
      lifesteal: 1,
    },
    equippedItems: {} as Record<string, typeof item>,
  };
  const boss = {
    id: '91',
    name: '林地守卫',
    avatar: 'https://camp.test/companion.svg',
    health: 90,
    attack: 10,
    rewardPoints: 15,
  };
  const state = {
    activity: activity.state,
    pet,
    empty: false,
    fail: false,
    panelFail: false,
    panelEmpty: false,
    bagEmpty: false,
    hold: false,
    release: () => {},
    feedFail: false,
    mineRequests: 0,
    actions: [] as string[],
    requests: [] as string[],
    battleCount: 0,
    owned: false,
    skinUsed: false,
    auto: null as null | {
      petId: string;
      foodCode: string;
      triggerThreshold: number;
      enabled: number;
    },
    locked: [] as number[],
    forgeLevel: 1,
    failBattle: false,
  };
  await page.addInitScript(
    ({ skin, mode }) => {
      localStorage.setItem('fish-island:skin', skin);
      localStorage.setItem('fish-island:color-mode', mode);
    },
    { skin, mode },
  );
  await page.route('https://camp.test/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: portrait }),
  );
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api\//, '');
    const signalHeaders = route.request().headers();
    state.requests.push(path);
    let data: unknown = true;
    if (path.startsWith('user/')) {
      data = {
        id: '123',
        userName: '合成岛友',
        userRole: 'user',
        userAvatar: '',
        saTokenInfo: { tokenName: 'synthetic-session', tokenValue: 'synthetic-value' },
      };
    } else if (path === 'hot/list') {
      data = [];
    } else {
      expect(signalHeaders['synthetic-session']).toBe('synthetic-value');
      if (path === 'pet/my/get') {
        state.mineRequests++;
        if (state.hold) {
          await new Promise<void>((resolve) => {
            state.release = resolve;
          });
        }
        if (state.fail)
          return route.fulfill({ json: { code: 40000, message: '合成读取失败，请重试' } });
        data = state.empty ? null : pet;
      } else if (path === 'pet/other') {
        expect(url.searchParams.get('otherUserId')).toBe('124');
        data = { ...pet, petId: '18', userId: '124', name: '栗栗' };
      } else if (path === 'pet/create') {
        const body = route.request().postDataJSON() as { name: string };
        pet.name = body.name;
        state.empty = false;
        data = '17';
        state.actions.push('create');
      } else if (path === 'pet/feed' || path === 'pet/pat') {
        state.actions.push(path);
        expect(route.request().method()).toBe('POST');
        expect(url.searchParams.get('petId')).toBe('17');
        if (state.feedFail)
          return route.fulfill({ json: { code: 40000, message: '尚在冷却，请稍后重试' } });
        pet.hunger = 90;
        pet.mood = 95;
        data = pet;
      } else if (path === 'pet/update/name') {
        expect((route.request().postDataJSON() as { petId: string }).petId).toBe('17');
        pet.name = (route.request().postDataJSON() as { name: string }).name;
        state.actions.push('rename');
      } else {
        if (state.panelFail)
          return route.fulfill({ json: { code: 40000, message: '合成面板读取失败，请重试' } });
        const records = <T>(values: T[]) => ({
          records: state.panelEmpty ? [] : values,
          total: state.panelEmpty ? 0 : values.length,
        });
        if (path === 'itemInstances/batchDecomposeBlueGreen') {
          state.bagEmpty = true;
          state.actions.push('batch');
          data = 20;
        } else if (path === 'boss/ranking')
          data = [{ userId: '124', petName: '栗栗', userName: '合成岛友乙', rank: 1, damage: 125 }];
        else if (path === 'itemInstances/my/list/page/vo')
          data = records(
            Array.from({ length: state.bagEmpty ? 0 : 12 }, (_, n) => ({
              ...item,
              id: String(501 + n),
            })),
          );
        else if (path.startsWith('itemTemplates/list/page/'))
          data = records(
            Array.from({ length: 12 }, (_, n) => ({
              ...template,
              id: String(40 + n),
              name: n === 0 ? template.name : `营地物品 ${n + 1}`,
            })),
          );
        else if (path === 'itemInstances/equip') {
          pet.equippedItems.hand = item;
          state.actions.push('equip');
        } else if (path === 'itemInstances/unequip') {
          delete pet.equippedItems.hand;
          state.actions.push('unequip');
        } else if (path === 'itemInstances/decompose') {
          data = 5;
          state.actions.push('decompose');
        } else if (path === 'itemTemplates/purchase') {
          state.actions.push('purchase');
        } else if (path === 'api/pet/skin/list')
          data = records([
            {
              skinId: '4',
              name: '秋日小苔',
              url: 'https://camp.test/autumn.svg',
              description: '暖暖的秋日衣装。',
              owned: state.owned,
              points: 30,
            },
          ]);
        else if (path === 'api/pet/skin/exchange') {
          state.owned = true;
          state.actions.push('exchange');
        } else if (path === 'api/pet/skin/set') {
          pet.petUrl = 'https://camp.test/autumn.svg';
          state.skinUsed = true;
          data = pet;
        } else if (path === 'api/pet/rank/list')
          data = state.panelEmpty
            ? []
            : [
                {
                  petId: '18',
                  userId: '124',
                  name: '栗栗',
                  userName: '合成岛友乙',
                  petUrl: pet.petUrl,
                  rank: 1,
                  level: 9,
                },
              ];
        else if (path === 'boss/list/cache') data = state.panelEmpty ? [] : [boss];
        else if (path === 'boss/battle/info')
          data = {
            petInfo: { petId: pet.petId, name: pet.name, avatar: pet.petUrl, health: 120 },
            bossInfo: { ...boss, maxHealth: 90 },
          };
        else if (path === 'pet/battle/info')
          data = {
            myPet: { petId: pet.petId, name: pet.name, avatar: pet.petUrl, health: 120 },
            opponentPet: { petId: '18', name: '栗栗', avatar: pet.petUrl, health: 90 },
          };
        else if (['pet/battle/start', 'boss/battle', 'tower/challenge'].includes(path)) {
          state.battleCount++;
          if (state.failBattle)
            return route.fulfill({ json: { code: 40000, message: '挑战次数不足，请明日再试' } });
          const rounds = [
            { attackerType: 'PET', damage: 45, petRemainingHealth: 120, bossRemainingHealth: 45 },
            { attackerType: 'BOSS', damage: 10, petRemainingHealth: 110, bossRemainingHealth: 45 },
            {
              attackerType: 'PET',
              damage: 45,
              petRemainingHealth: 110,
              bossRemainingHealth: 0,
              isCritical: true,
            },
          ];
          data =
            path === 'tower/challenge'
              ? { battleRounds: rounds, win: true, rewardPoints: 10 }
              : rounds;
        } else if (path === 'tower/progress')
          data = {
            maxFloor: 2,
            completed: false,
            nextMonster: { ...boss, floor: 3, avatarUrl: boss.avatar },
          };
        else if (path === 'pet/autoFeed/config') {
          if (route.request().method() === 'POST') {
            state.auto = route.request().postDataJSON() as typeof state.auto;
            state.actions.push('auto');
          }
          data = state.auto;
        } else if (path === 'pet/forge/detail')
          data = {
            equipLevel: state.forgeLevel,
            nextUpgradeCost: 20,
            successRate: 80,
            maxLevel: false,
            ...Object.fromEntries(
              [1, 2, 3, 4].map((n) => [
                `entry${n}`,
                { attr: 'attack', value: n * 2, locked: state.locked.includes(n) },
              ]),
            ),
          };
        else if (path === 'pet/forge/lock') {
          state.locked = (
            route.request().postDataJSON() as { lockedEntries: number[] }
          ).lockedEntries;
          data = {};
        } else if (path === 'pet/forge/refresh') {
          state.actions.push('forge-refresh');
          data = {};
        } else if (path === 'pet/forge/upgrade') {
          state.forgeLevel++;
          state.actions.push('forge-upgrade');
        } else if (path.startsWith('turntable/') || path.startsWith('pet/tournament/')) {
          const result = activity.handle(
            path,
            route.request().postData() ? route.request().postDataJSON() : null,
          );
          if (!result) throw new Error(`缺失活动夹具 ${path}`);
          data = result.data;
        } else
          return route.fulfill({
            status: 404,
            json: { code: 40400, message: `未模拟的路径 ${path}` },
          });
      }
    }
    return route.fulfill({ json: { code: 0, data } });
  });
  await page.goto('/user/login?redirect=%2Fpet');
  await page.getByRole('textbox', { name: '账号或邮箱', exact: true }).fill('synthetic-account');
  await page.getByLabel('密码', { exact: true }).fill('synthetic-password');
  await page.getByRole('button', { name: '登录', exact: true }).last().click();
  await expect(page).toHaveURL('/pet');
  await page.goto('/pet');
  await expect(page.getByRole('heading', { name: '伙伴营地', exact: true })).toBeVisible({
    timeout: 90000,
  });
  return state;
}
