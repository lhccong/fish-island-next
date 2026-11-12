import { useState } from 'react';
import { equipmentSlots, type Companion, type PetPort } from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { usePetOperation } from './resource';
import { OperationNotice } from './Feedback';
import styles from './Panels.module.css';

export function CarePanel({
  service,
  pet,
  onChange,
}: {
  service: PetPort;
  pet: Companion;
  onChange: () => void;
}) {
  const [name, setName] = useState(pet.name);
  const operation = usePetOperation();
  return (
    <div className={styles.columns}>
      <section className={styles.section}>
        <h3>伙伴档案</h3>
        <div className={styles.card}>
          <p>
            等级 <strong>Lv.{pet.level}</strong>
          </p>
          <p>
            经验 <strong>{pet.exp}</strong>
          </p>
          <p>
            饱食 <strong>{pet.hunger}</strong>
          </p>
          <p>
            心情 <strong>{pet.mood}</strong>
          </p>
          <p className={styles.muted}>
            喂食消耗 5 积分，抚摸消耗 3 积分；各有 1 小时冷却，以服务端结果为准。
          </p>
        </div>
        <form
          className={styles.card}
          onSubmit={(event) => {
            event.preventDefault();
            void operation.run(
              (s) => service.rename(pet.id, name.trim(), s),
              '伙伴名字已更新',
              onChange,
            );
          }}
        >
          <label>
            伙伴名字
            <input
              value={name}
              maxLength={20}
              required
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <div className={styles.actions}>
            <Button
              type="submit"
              disabled={operation.pending || !name.trim() || name.trim() === pet.name}
            >
              {operation.pending ? '保存中…' : '保存名字'}
            </Button>
          </div>
        </form>
        <OperationNotice notice={operation.notice} />
      </section>
      <section className={styles.section}>
        <h3 data-tone="violet">能力属性</h3>
        <dl className={styles.stats}>
          {pet.stats.length ? (
            pet.stats.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))
          ) : (
            <p className={styles.muted}>服务端尚未提供属性数据。</p>
          )}
        </dl>
      </section>
      <section className={styles.section}>
        <h3 data-tone="amber">当前装备</h3>
        <div className={styles.stack}>
          {pet.equipment.length ? (
            pet.equipment.map(({ slot, item }) => (
              <div className={styles.card} key={slot}>
                <strong>{equipmentSlots[slot] || slot}</strong>
                <p>
                  {item.name} +{item.level}
                </p>
              </div>
            ))
          ) : (
            <div className={styles.card}>还没有穿戴装备，可在行囊中选择装备。</div>
          )}
        </div>
      </section>
    </div>
  );
}
