import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import type { PetCardPack, PetCardPlayAction } from '@/domain/pet';
import { ConfirmAction } from './ConfirmAction';
import { PetBatchOpen } from './PetBatchOpen';

export function PetPackPurchase({
  pack,
  lockedAt,
  free,
  stock,
  balance,
  pending,
  onClaim,
  onOpen,
  submit,
}: {
  pack: PetCardPack;
  lockedAt: number | null;
  free: number | null;
  stock: number;
  balance: number;
  pending: boolean;
  onClaim: () => void;
  onOpen: () => void;
  submit: (action: PetCardPlayAction, signal: AbortSignal) => Promise<void>;
}) {
  return (
    <>
      {lockedAt && <p>抽卡等级达到 {lockedAt} 级后解锁</p>}
      {free !== null && (
        <Button disabled={pending || free === 0} variant="secondary" onClick={onClaim}>
          {free ? `免费领一包（剩 ${free} 次）` : '今日免费已领完'}
        </Button>
      )}
      {([1, 10] as const).map((quantity) => {
        const cost = pack.unitPrice * (quantity === 10 ? 9 : 1);
        return (
          <ConfirmAction
            key={quantity}
            label={`买 ${quantity} 包 · ${cost.toLocaleString('zh-CN')} 积分${quantity === 10 ? '（九折）' : ''}`}
            description={`花费 ${cost.toLocaleString('zh-CN')} 积分购买 ${quantity} 包${pack.name}。${quantity === 10 ? '十包享九折。' : ''}`}
            disabled={!!lockedAt || pending || balance < cost}
            action={(signal) =>
              submit({ type: 'buy', poolId: pack.id, unitPrice: pack.unitPrice, quantity }, signal)
            }
            onSuccess={() => {}}
          />
        );
      })}
      {!lockedAt && (
        <>
          <PetBatchOpen
            key={pack.id}
            poolId={pack.id}
            stock={stock}
            pending={pending}
            submit={submit}
          />
          <Button disabled={pending || !stock} onClick={onOpen}>
            拆开卡包
          </Button>
        </>
      )}
      {pending && <LoadingIndicator compact>正在处理…</LoadingIndicator>}
    </>
  );
}
