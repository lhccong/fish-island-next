import { type ReactNode } from 'react';
import { farmService, subscribeToFarmChanges } from '@/app/config/farm';
import { useHarvestStatus } from '@/features/farm/harvest-status';
import { chatFarmHarvestStatus } from './chat-farm-harvest-context';

export function ChatFarmHarvestStatus({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  const harvestable = useHarvestStatus(active, farmService.harvestStatus, subscribeToFarmChanges);
  return (
    <chatFarmHarvestStatus.Provider value={harvestable}>{children}</chatFarmHarvestStatus.Provider>
  );
}
