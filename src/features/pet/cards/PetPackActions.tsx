import type { Ref } from 'react';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';

type RevealActions = {
  label: string;
  opening: boolean;
  advance: () => void;
  flipAll: (() => void) | undefined;
};

export function PetPackRevealActions({
  pending,
  actionRef,
  reveal,
}: {
  pending: boolean;
  actionRef: Ref<HTMLButtonElement>;
  reveal: RevealActions;
}) {
  return (
    <>
      {reveal.flipAll && (
        <Button variant="secondary" disabled={pending} onClick={reveal.flipAll}>
          全部翻开
        </Button>
      )}
      <Button ref={actionRef} onClick={reveal.advance} disabled={pending || reveal.opening}>
        {pending || reveal.opening ? (
          <LoadingIndicator compact>{reveal.opening ? reveal.label : '正在保存…'}</LoadingIndicator>
        ) : (
          reveal.label
        )}
      </Button>
    </>
  );
}

export function PetPackActions({
  canClaim,
  hasStock,
  pending,
  actionRef,
  reveal,
  onClaim,
  onOpen,
}: {
  canClaim: boolean;
  hasStock: boolean;
  pending: boolean;
  actionRef: Ref<HTMLButtonElement>;
  reveal: RevealActions | undefined;
  onClaim: () => void;
  onOpen: () => void;
}) {
  if (reveal)
    return <PetPackRevealActions pending={pending} actionRef={actionRef} reveal={reveal} />;
  return (
    <>
      <Button
        variant={hasStock ? 'secondary' : 'primary'}
        disabled={pending || !canClaim}
        onClick={onClaim}
      >
        {pending ? (
          <LoadingIndicator compact>正在领取…</LoadingIndicator>
        ) : canClaim ? (
          '领取卡包'
        ) : (
          '今日已领完'
        )}
      </Button>
      {hasStock && (
        <Button disabled={pending} onClick={onOpen}>
          拆开卡包
        </Button>
      )}
    </>
  );
}
