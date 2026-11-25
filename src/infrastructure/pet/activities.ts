import type { PetPort, Supply, SupplyPrize } from '@/domain/pet';
import { record, list, id, text, number, image, page, round } from './decode';
type Request = (
  path: string,
  signal: AbortSignal,
  body?: object,
  post?: boolean,
) => Promise<unknown>;

function prize(value: unknown): SupplyPrize {
  const data = record(value);
  return {
    prizeKey: String(data.turntablePrizeId ?? data.id ?? data.prizeId ?? ''),
    qualityLevel: number(data.quality),
    convertedPoints: data.convertedToPoints === true ? number(data.convertedPoints) : null,
    id:
      data.id !== undefined
        ? id(data.id)
        : data.prizeId !== undefined
          ? id(data.prizeId)
          : `${text(data.name)}:${text(data.qualityName)}`,
    name: text(data.name),
    icon: image(data.icon),
    quality: text(data.qualityName),
    probability: data.probability === undefined ? null : number(data.probability),
    time: text(data.createTime),
  };
}
function supply(value: unknown): Supply {
  const data = record(value);
  const progress = data.userProgress ? record(data.userProgress) : null;
  return {
    ...(progress
      ? {
          progress: {
            total: number(progress.totalDrawCount),
            lastDrawTime: text(progress.lastDrawTime),
          },
        }
      : {}),
    id: id(data.id),
    name: text(data.name),
    cost: number(data.costPoints),
    guarantee: number(data.guaranteeCount),
    prizes: data.prizeList ? list(data.prizeList, prize) : [],
  };
}
export function createPetActivities(
  request: Request,
  baseUrl = '',
): Pick<PetPort, 'tournament' | 'compete' | 'supplies' | 'supply' | 'draw' | 'drawRecords'> {
  return {
    async tournament(signal) {
      // Reading the leaderboard auto-enrols the current companion on the server.
      const ranks = await request('pet/tournament/leaderboard', signal);
      const mine = await request('pet/tournament/my/rank', signal);
      return {
        mine: mine === null ? null : number(mine),
        ranks: list(ranks, (value) => {
          const data = record(value);
          return {
            id: id(data.userId),
            userId: id(data.userId),
            name: text(data.petName),
            owner: text(data.userName),
            ownerAvatar: image(data.userAvatar),
            url: image(data.petUrl),
            rank: number(data.rank),
            level: number(data.petLevel),
          };
        }),
      };
    },
    async compete(rank, signal) {
      const data = record(
        await request(`pet/tournament/challenge?targetRank=${rank}`, signal, undefined, true),
      );
      if (typeof data.isWin !== 'boolean') throw new Error('排位结果格式异常，请刷新确认当前名次');
      return {
        win: data.isWin,
        rank: data.myRank === null ? null : number(data.myRank),
        rounds: list(data.rounds ?? [], (value) => round(value, baseUrl)),
      };
    },
    async supplies(signal) {
      return list(await request('turntable/list', signal), supply);
    },
    async supply(supplyId, signal) {
      return supply(await request(`turntable/detail/${encodeURIComponent(supplyId)}`, signal));
    },
    async draw(supplyId, count, signal) {
      const data = record(
        await request('turntable/draw', signal, { turntableId: supplyId, drawCount: count }),
      );
      return { cost: number(data.costPoints), prizes: list(data.prizeList, prize) };
    },
    async drawRecords(current, signal, turntableId) {
      const query = new URLSearchParams({
        current: String(current),
        pageSize: '13',
        sortField: 'createTime',
        sortOrder: 'descend',
        ...(turntableId ? { turntableId } : {}),
      });
      return page(await request(`turntable/records?${query}`, signal), prize);
    },
  };
}
