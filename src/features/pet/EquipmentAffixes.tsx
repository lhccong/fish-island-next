import { cloneElement, useCallback, useState, type ReactElement } from 'react';
import { forgeSlots, type PetItem, type PetPort } from '@/domain/pet';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { ResourceView } from './Feedback';
import { ForgeEntryName } from './ForgeEntryName';
import { formatPetStat } from './format-stat';
import { usePetResource } from './resource';
import forgeStyles from './ForgePanel.module.css';
import styles from './EquipmentAffixes.module.css';

export function EquipmentAffixes({
  service,
  petId,
  slot,
  item,
  trigger,
}: {
  service: PetPort;
  petId: string;
  slot: string;
  item: Pick<PetItem, 'name' | 'level'>;
  trigger: ReactElement<{ disabled?: boolean }>;
}) {
  const [open, setOpen] = useState(false);
  const part = forgeSlots.find((part) => part.slot === (slot === 'wings' ? 'wing' : slot));
  if (!part) return cloneElement(trigger, { disabled: true });
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={item.name}
      description={part.label}
      dismissLabel="关闭装备词条"
      showCloseAction={false}
      className={styles.dialog ?? ''}
    >
      {open && (
        <EquipmentAffixList
          service={service}
          petId={petId}
          slot={Number(part.value)}
          level={item.level}
        />
      )}
    </Dialog>
  );
}

function EquipmentAffixList({
  service,
  petId,
  slot,
  level,
}: {
  service: PetPort;
  petId: string;
  slot: number;
  level: number;
}) {
  const load = useCallback(
    (signal: AbortSignal) => service.equipmentForge(petId, slot, signal),
    [service, petId, slot],
  );
  const resource = usePetResource(load);
  return (
    <ScrollArea label="装备词条" gutter="reserved" className={styles.scroll ?? ''}>
      <div className={styles.body}>
        <ResourceView state={resource.state} reload={resource.reload}>
          {(data) => (
            <>
              <p className={styles.level}>强化 +{data?.level ?? level}</p>
              <h3 className={styles.heading}>附加词条</h3>
              {data?.entries.length ? (
                <ul className={`${forgeStyles.entries} ${styles.entries}`}>
                  {data.entries.map((entry) => (
                    <li
                      className={`${forgeStyles.entry} ${styles.entry}`}
                      data-grade={entry.grade ?? 'unknown'}
                      key={entry.number}
                    >
                      <span>
                        <ForgeEntryName entry={entry} />
                        {entry.locked && <small>已锁定</small>}
                      </span>
                      <strong>{formatPetStat(entry.name, entry.value, true)}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.empty}>此部位暂无词条。</p>
              )}
            </>
          )}
        </ResourceView>
      </div>
    </ScrollArea>
  );
}
