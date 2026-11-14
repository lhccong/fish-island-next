import type { PetPort, BattleTarget } from '@/domain/pet';
import type { SessionToken } from '@/domain/auth';
import { createPetActivities } from './activities';
import {
  record,
  number,
  text,
  id,
  image,
  list,
  page,
  item,
  companion,
  skin,
  challenger,
  round,
  autoFeed,
  forge,
} from './decode';

export function createPetClient(
  baseUrl: string,
  token: () => SessionToken | null,
  onExpired: () => void,
): PetPort {
  async function request(
    path: string,
    signal: AbortSignal,
    body?: object,
    post = false,
  ): Promise<unknown> {
    const credential = token();
    if (!credential) throw new Error('请先登录后再进入伙伴营地');
    const headers = new Headers({ [credential.name]: credential.value });
    if (body) headers.set('Content-Type', 'application/json');
    try {
      const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/${path}`, {
        method: body || post ? 'POST' : 'GET',
        headers,
        credentials: 'include',
        cache: 'no-store',
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (response.status === 401) {
        onExpired();
        throw new Error('登录已过期，请重新登录');
      }
      if (!response.ok) throw new Error(`伙伴服务暂不可用（HTTP ${response.status}），请稍后重试`);
      const payload = record(await response.json());
      if (payload.code === 40100) {
        onExpired();
        throw new Error('登录已过期，请重新登录');
      }
      if (payload.code !== 0) throw new Error(text(payload.message) || '操作失败，请稍后重试');
      return payload.data;
    } catch (error) {
      if (signal.aborted) throw error;
      if (error instanceof TypeError) throw new Error('连接伙伴服务失败，请检查网络后重试');
      throw error;
    }
  }
  function confirmed(value: unknown) {
    if (value !== true) throw new Error('服务器未确认操作成功，请刷新查看当前状态');
  }
  const query = (values: Record<string, string | number>) =>
    new URLSearchParams(Object.entries(values).map(([k, v]) => [k, String(v)])).toString();
  function battlePath(target: BattleTarget, preview: boolean) {
    if (target.kind === 'tower') return `tower/${preview ? 'progress' : 'challenge'}`;
    return target.kind === 'boss'
      ? `boss/${preview ? 'battle/info' : 'battle'}?${query({ bossId: target.id })}`
      : `pet/battle/${preview ? 'info' : 'start'}?${query({ opponentUserId: target.id })}`;
  }
  return {
    ...createPetActivities(request),
    async other(userId, signal) {
      const data = await request(`pet/other?${query({ otherUserId: userId })}`, signal);
      return data === null ? null : companion(data);
    },
    async bossRanks(bossId, signal) {
      return list(
        await request(`boss/ranking?${query({ bossId, limit: 20 })}`, signal),
        (value) => {
          const data = record(value);
          return {
            userId: id(data.userId),
            name: text(data.petName),
            owner: text(data.userName),
            avatar: image(data.userAvatar),
            petUrl: image(data.petAvatar),
            rank: number(data.rank),
            damage: number(data.damage),
          };
        },
      );
    },
    async batchDecompose(signal) {
      const data = await request('itemInstances/batchDecomposeBlueGreen', signal, undefined, true);
      if (typeof data !== 'number') throw new Error('服务器未返回分解所得积分');
      return number(data);
    },
    async mine(signal) {
      const data = await request('pet/my/get', signal);
      return data === null ? null : companion(data);
    },
    async create(name, signal) {
      id(await request('pet/create', signal, { name }));
    },
    async care(action, petId, signal) {
      return companion(await request(`pet/${action}?${query({ petId })}`, signal, undefined, true));
    },
    async rename(petId, name, signal) {
      confirmed(await request('pet/update/name', signal, { petId, name }));
    },
    async items(kind, current, signal) {
      const path =
        kind === 'bag'
          ? 'itemInstances/my/list/page/vo'
          : `itemTemplates/list/page/${kind === 'shop' ? 'purchasable' : 'vo'}`;
      return page(await request(path, signal, { current, pageSize: 12 }), (v) =>
        item(v, kind === 'bag'),
      );
    },
    async itemAction(action, itemId, signal) {
      const data =
        action === 'purchase'
          ? await request(
              `itemTemplates/purchase?${query({ templateId: itemId, quantity: 1 })}`,
              signal,
              undefined,
              true,
            )
          : await request(
              `itemInstances/${action}`,
              signal,
              action === 'unequip' ? { equipSlot: itemId } : { itemInstanceId: itemId },
            );
      if (action === 'decompose') {
        if (typeof data !== 'number') throw new Error('服务器未返回分解所得积分');
        number(data);
      } else confirmed(data);
    },
    async skins(current, signal) {
      return page(
        await request(`api/pet/skin/list?${query({ current, pageSize: 12 })}`, signal),
        skin,
      );
    },
    async skinAction(action, skinId, signal) {
      const data = await request(`api/pet/skin/${action}`, signal, { skinId });
      if (action === 'exchange') confirmed(data);
      else companion(data);
    },
    async ranks(signal) {
      return list(await request('api/pet/rank/list?limit=20', signal), (value) => {
        const data = record(value);
        return {
          id: id(data.petId),
          userId: id(data.userId),
          owner: text(data.userName),
          ownerAvatar: image(data.userAvatar),
          name: text(data.name),
          url: image(data.petUrl),
          level: number(data.level),
          rank: number(data.rank),
        };
      });
    },
    async bosses(signal) {
      return list(await request('boss/list/cache', signal), challenger);
    },
    async preview(target, signal) {
      const data = record(await request(battlePath(target, true), signal));
      return {
        self: challenger(target.kind === 'boss' ? data.petInfo : data.myPet),
        opponent: challenger(target.kind === 'boss' ? data.bossInfo : data.opponentPet),
      };
    },
    async battle(target, signal) {
      const data = await request(
        battlePath(target, false),
        signal,
        undefined,
        target.kind === 'tower',
      );
      if (target.kind === 'tower') {
        const result = record(data);
        if (typeof result.win !== 'boolean') throw new Error('挑战结果格式异常');
        return {
          rounds: list(result.battleRounds, round),
          win: result.win,
          reward: number(result.rewardPoints),
        };
      }
      return { rounds: list(data, round) };
    },
    async tower(signal) {
      const data = record(await request('tower/progress', signal));
      return {
        floor: number(data.maxFloor),
        maxOpenFloor: number(data.maxOpenFloor),
        nextFloor:
          data.completed === true ? null : number(data.nextFloor, number(data.maxFloor) + 1),
        completed: data.completed === true,
        next: data.nextMonster ? challenger(data.nextMonster) : null,
      };
    },
    async towerFloor(floor, signal) {
      return challenger(await request(`tower/floor?${query({ floor })}`, signal));
    },
    async towerRanks(signal) {
      return list(await request('tower/ranking?limit=20', signal), (value) => {
        const data = record(value);
        return {
          userId: id(data.userId),
          name: text(data.userName) || '岛友',
          avatar: image(data.userAvatar),
          rank: number(data.rank),
          floor: number(data.maxFloor),
        };
      });
    },
    async autoFeed(petId, signal) {
      const data = await request(`pet/autoFeed/config?${query({ petId })}`, signal);
      return data === null ? null : autoFeed(data);
    },
    async saveAutoFeed(petId, value, signal) {
      return autoFeed(
        await request('pet/autoFeed/config', signal, {
          petId,
          foodCode: value.foodCode,
          triggerThreshold: value.threshold,
          enabled: value.enabled ? 1 : 0,
        }),
      );
    },
    async forge(petId, equipSlot, signal) {
      return forge(await request('pet/forge/detail', signal, { petId, equipSlot }));
    },
    async forgeAction(action, petId, equipSlot, lockedEntries, signal) {
      const data = await request(`pet/forge/${action}`, signal, {
        petId,
        equipSlot,
        ...(action === 'lock' ? { lockedEntries } : {}),
      });
      if (action === 'upgrade') {
        if (typeof data !== 'boolean') throw new Error('锻造结果格式异常');
        return data;
      }
      record(data);
      return true;
    },
  };
}
