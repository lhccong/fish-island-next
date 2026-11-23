import { petCardBulkUpgradeQuote, type PetCardOwned, type PetCardPlayAction } from '@/domain/pet';
import { ConfirmAction } from './ConfirmAction';

export function PetCardBulkUpgrade({
  collection,
  pending,
  submit,
}: {
  collection: readonly PetCardOwned[];
  pending: boolean;
  submit: (action: PetCardPlayAction, signal: AbortSignal) => Promise<void>;
}) {
  const { upgradedCards, addedStars, spentDuplicates } = petCardBulkUpgradeQuote(collection);
  return (
    <ConfirmAction
      label="一键升星"
      description={`为 ${upgradedCards} 张卡片合计提升 ${addedStars} 星，消耗 ${spentDuplicates} 张同名重复卡。`}
      disabled={pending || !upgradedCards}
      action={(signal) => submit({ type: 'upgradeAll' }, signal)}
      onSuccess={() => {}}
    />
  );
}
