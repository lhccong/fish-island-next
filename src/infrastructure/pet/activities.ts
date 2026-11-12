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
  return {
    id: id(data.id),
    name: text(data.name),
    cost: number(data.costPoints),
    guarantee: number(data.guaranteeCount),
    prizes: data.prizeList ? list(data.prizeList, prize) : [],
  };
}
export function createPetActivities(
  request: Request,
): Pick<PetPort, 'tournament' | 'compete' | 'supplies' | 'supply' | 'draw' | 'drawRecords'> {
  return {
    async tournament(signal) {
      const [ranks, mine] = await Promise.all([
        request('pet/tournament/leaderboard', signal),
        request('pet/tournament/my/rank', signal),
      ]);
      return {
        mine: mine === null ? null : number(mine),
        ranks: list(ranks, (value) => {
          const data = record(value);
          return {
            id: id(data.userId),
            userId: id(data.userId),
            name: text(data.petName),
            owner: text(data.userName),
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
        rounds: list(data.rounds ?? [], round),
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
    async drawRecords(current, signal) {
      return page(await request(`turntable/records?current=${current}&pageSize=12`, signal), prize);
    },
  };
}
