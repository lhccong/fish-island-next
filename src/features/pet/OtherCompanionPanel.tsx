import { useCallback } from 'react';
import type { PetPort } from '@/domain/pet';
import { usePetResource } from './resource';
import { ResourceView } from './Feedback';
import { CompanionSummary } from './CompanionSummary';
import { PanelDialog } from './PanelDialog';
import { formatPetStat } from './format-stat';
import { ItemIcon } from './ItemIcon';
import styles from './Panels.module.css';

export function OtherCompanionPanel({
  service,
  userId,
  onClose,
}: {
  service: PetPort;
  userId: string;
  onClose: () => void;
}) {
  const load = useCallback(
    (signal: AbortSignal) => service.other(userId, signal),
    [service, userId],
  );
  const resource = usePetResource(load);
  return (
    <PanelDialog title="伙伴资料" description="查看这位岛友的伙伴与装备属性。" onClose={onClose}>
      <ResourceView state={resource.state} reload={resource.reload}>
        {(pet) =>
          pet ? (
            <>
              <CompanionSummary pet={pet} />
              <div className={styles.columns}>
                <section className={styles.section}>
                  <h3>能力属性</h3>
                  <dl className={styles.stats}>
                    {pet.stats.map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{formatPetStat(label, value)}</dd>
                      </div>
                    ))}
                  </dl>
                  {!pet.stats.length && <p className={styles.muted}>暂未返回属性信息。</p>}
                </section>
                <section className={styles.section}>
                  <h3 data-tone="amber">穿戴装备</h3>
                  <div className={styles.stack}>
                    {pet.equipment.length ? (
                      pet.equipment.map(({ slot, item }) => (
                        <div className={styles.card} key={slot}>
                          <div className={styles.itemHeading}>
                            <ItemIcon url={item.icon} name={item.name} level={item.level} />
                            <span>
                              {item.name} +{item.level}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className={styles.muted}>尚未穿戴装备。</p>
                    )}
                  </div>
                </section>
              </div>
            </>
          ) : (
            <div className={styles.feedback}>这位岛友还没有领养伙伴。</div>
          )
        }
      </ResourceView>
    </PanelDialog>
  );
}
