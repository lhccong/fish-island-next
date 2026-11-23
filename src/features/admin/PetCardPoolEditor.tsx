import { useState } from 'react';
import type { AdminPetCardPort } from '@/domain/admin';
import {
  defaultPetCardWeights,
  petCardGradeIds,
  petCardGrades,
  type PetCardPoolDefinition,
} from '@/domain/pet';
import { EditorFrame, type EditorProps } from './EditorFrame';
import { Field } from './fields';
import styles from './PetCardPoolSettings.module.css';

export function PetCardPoolEditor({
  pool,
  port,
  ...modal
}: EditorProps & { pool: PetCardPoolDefinition | null; port: AdminPetCardPort }) {
  const [value, setValue] = useState<PetCardPoolDefinition>(
    () =>
      pool ?? {
        id: '',
        name: '',
        sortOrder: 100,
        coverId: null,
        weights: defaultPetCardWeights,
        version: null,
      },
  );
  const edit = (fields: Partial<PetCardPoolDefinition>) =>
    setValue((old) => ({ ...old, ...fields }));
  return (
    <EditorFrame
      {...modal}
      bodyClassName={styles.editorBody ?? ''}
      title={pool ? '配置卡池' : '新增卡池'}
      onSubmit={(signal) => port.savePool(value, signal)}
    >
      <div className={styles.fields}>
        <Field
          label="卡池编号"
          value={value.id}
          readOnly={!!pool}
          required
          pattern="[A-Za-z][A-Za-z0-9_\-]{0,47}"
          onChange={(e) => edit({ id: e.target.value })}
        />
        <Field
          label="卡池名称"
          value={value.name}
          required
          maxLength={80}
          onChange={(e) => edit({ name: e.target.value })}
        />
        <Field
          label="排序"
          value={value.sortOrder}
          type="number"
          min={0}
          max={1000000}
          required
          onChange={(e) => edit({ sortOrder: Number(e.target.value) })}
        />
        <Field
          label="封面卡牌编号（选填）"
          value={value.coverId ?? ''}
          maxLength={48}
          onChange={(e) => edit({ coverId: e.target.value.trim() || null })}
        />
      </div>
      <section className={styles.group} aria-label="品质权重">
        <h3>品质权重</h3>
        <p className={styles.help}>
          权重为 0 的品质不参与普通抽取。有闪耀卡时，首包仍保底一张闪耀卡。
        </p>
        <div className={styles.fields}>
          {petCardGradeIds.map((grade) => (
            <Field
              key={grade}
              label={`${petCardGrades[grade].name}权重`}
              type="number"
              min={0}
              max={10000}
              required
              value={value.weights[grade]}
              onChange={(e) =>
                edit({ weights: { ...value.weights, [grade]: Number(e.target.value) } })
              }
            />
          ))}
        </div>
      </section>
    </EditorFrame>
  );
}
