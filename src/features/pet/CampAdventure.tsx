import type { Companion, TreasurePort } from '@/domain/pet';
import { CampScene } from './CampScene';
import { TreasureStatus } from './TreasureStatus';
import { useCampTreasure } from './use-camp-treasure';

export function CampAdventure({
  pet,
  service,
  onSettled,
}: {
  pet: Companion | null;
  service: TreasurePort;
  onSettled: ((signal: AbortSignal) => Promise<unknown>) | undefined;
}) {
  const treasure = useCampTreasure(service, !!pet, onSettled);
  return (
    <div>
      <CampScene
        pet={pet}
        treasure={treasure.data?.active ?? null}
        digging={!!treasure.data?.active || treasure.pending === 'start'}
        animating={
          !!treasure.data?.active && treasure.now < treasure.data.active.readyAt && !treasure.error
        }
        canDig={treasure.available}
        onDig={treasure.start}
      />
      <TreasureStatus enabled={!!pet} treasure={treasure} />
    </div>
  );
}
