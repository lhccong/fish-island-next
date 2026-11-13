export interface RedPacketDetail {
  name: string;
  type: 1 | 2 | 3;
  remainingCount: number;
  status: 0 | 1 | 2;
}

export interface RedPacketRecord {
  id: string;
  userName: string;
  amount: number;
  grabTime: string | null;
}

export interface RedPacketPort {
  create(input: RedPacketCreateInput, signal: AbortSignal): Promise<string>;
  detail(id: string, signal: AbortSignal): Promise<RedPacketDetail>;
  grab(id: string, answer: string, signal: AbortSignal): Promise<number>;
  records(id: string, signal: AbortSignal): Promise<readonly RedPacketRecord[]>;
}

export interface RedPacketCreateInput {
  type: 1 | 2 | 3;
  totalAmount: number;
  count: number;
  name: string;
  answer?: string;
}
export interface RedPacketFormValues {
  type: 1 | 2 | 3;
  totalAmount: string;
  count: string;
  name: string;
  answer: string;
}
export class RedPacketCreateError extends Error {
  readonly kind: 'rejected' | 'uncertain';
  constructor(kind: 'rejected' | 'uncertain', message: string) {
    super(message);
    this.kind = kind;
    this.name = 'RedPacketCreateError';
  }
}
export function validateRedPacketForm(values: RedPacketFormValues): RedPacketCreateInput {
  const totalAmount = Number(values.totalAmount.trim());
  const count = Number(values.count.trim());
  if (
    !/^\d+$/.test(values.totalAmount.trim()) ||
    !Number.isSafeInteger(totalAmount) ||
    totalAmount < 1 ||
    totalAmount > 100
  )
    throw new Error('总积分请输入 1～100 的整数');
  if (
    !/^\d+$/.test(values.count.trim()) ||
    !Number.isSafeInteger(count) ||
    count < 1 ||
    count > totalAmount
  )
    throw new Error('红包个数请输入不大于总积分的正整数');
  if (Math.floor(totalAmount / count) > 10)
    throw new Error('每份平均不能超过 10 积分，请增加红包个数');
  if (![1, 2, 3].includes(values.type)) throw new Error('请选择有效的红包类型');
  const name = values.name.trim();
  if (name.length > 200) throw new Error('祝福语或题目不能超过 200 字');
  if (values.type === 3 && !name) throw new Error('请输入答题红包的题目');
  const answer = values.answer.trim();
  if (values.type === 3 && (!answer || answer.length > 50))
    throw new Error('正确答案请输入 1～50 字');
  return {
    type: values.type,
    totalAmount,
    count,
    name: name || '恭喜发财，大吉大利！',
    ...(values.type === 3 ? { answer } : {}),
  };
}
