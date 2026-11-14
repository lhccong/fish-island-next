export interface LuckyBagDetail {
  id: string;
  name: string;
  creatorName: string;
  totalAmount: number;
  winnerCount: number;
  participantCount: number;
  type: 1 | 2;
  status: 0 | 1 | 2;
  joined: boolean;
  drawTime: number;
}
export interface LuckyBagRecord {
  id: string;
  userName: string;
  amount: number;
  winTime: number | null;
}
export interface LuckyBagCreateInput {
  name: string;
  type: 1 | 2;
  totalAmount: number;
  winnerCount: number;
  durationSeconds: number;
}
export interface LuckyBagFormValues {
  name: string;
  type: 1 | 2;
  totalAmount: string;
  winnerCount: string;
  durationSeconds: string;
}
export interface LuckyBagPort {
  create(input: LuckyBagCreateInput, signal: AbortSignal): Promise<LuckyBagDetail>;
  detail(id: string, signal: AbortSignal): Promise<LuckyBagDetail>;
  join(id: string, signal: AbortSignal): Promise<void>;
  active(signal: AbortSignal): Promise<readonly LuckyBagDetail[]>;
  records(id: string, signal: AbortSignal): Promise<readonly LuckyBagRecord[]>;
}
export class LuckyBagCreateError extends Error {
  readonly kind: 'rejected' | 'uncertain';
  constructor(kind: 'rejected' | 'uncertain', message: string) {
    super(message);
    this.kind = kind;
    this.name = 'LuckyBagCreateError';
  }
}
export function validateLuckyBagForm(values: LuckyBagFormValues): LuckyBagCreateInput {
  const integer = (value: string, min: number, max: number, message: string) => {
    const number = Number(value.trim());
    if (
      !/^\d+$/.test(value.trim()) ||
      !Number.isSafeInteger(number) ||
      number < min ||
      number > max
    )
      throw new Error(message);
    return number;
  };
  const totalAmount = integer(values.totalAmount, 1, 100, '总积分请输入 1～100 的整数');
  const winnerCount = integer(
    values.winnerCount,
    1,
    Math.min(20, totalAmount),
    '中奖人数请输入 1～20 且不大于总积分的整数',
  );
  if (Math.ceil(totalAmount / winnerCount) > 50)
    throw new Error('单人最多 50 积分，请增加中奖人数');
  const durationSeconds = integer(
    values.durationSeconds,
    60,
    1800,
    '持续时间请输入 60～1800 秒的整数',
  );
  if (values.type !== 1 && values.type !== 2) throw new Error('请选择有效的分配方式');
  const name = values.name.trim() || '快来参与福袋吧';
  if (name.length > 50) throw new Error('福袋名称不能超过 50 字');
  return { name, totalAmount, winnerCount, durationSeconds, type: values.type };
}
