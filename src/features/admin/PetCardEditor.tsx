import { useState } from 'react';
import type { AdminPetCardPort } from '@/domain/admin';
import {
  petCardActions,
  petCardGradeIds,
  petCardGrades,
  petCardRecoveryEffect,
  petCardStatLabels,
  type PetCardAtlasDefinition,
  type PetCardDefinition,
  type PetCardGrade,
  type PetCardPoolDefinition,
} from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { Switch } from '@/shared/ui/Switch';
import { EditorFrame, type EditorProps } from './EditorFrame';
import { Choice, Field } from './fields';
import { PetCardBattleFields } from './PetCardBattleFields';
import styles from './PetCardPoolSettings.module.css';

const grades = petCardGradeIds.map((value) => ({ value, label: petCardGrades[value].name }));
const stats = Object.keys(petCardStatLabels) as (keyof typeof petCardStatLabels)[];
const slots = Array.from({ length: 10 }, (_, value) => ({
  value: String(value),
  label: `第 ${value + 1} 格`,
}));

function initialPetCardBattle(grade: PetCardGrade): PetCardDefinition['battle'] {
  if (grade === 'common') return petCardActions.attack;
  if (grade === 'fine') return petCardRecoveryEffect;
  return {
    kind: 'effect',
    name: '',
    turnOffset: 1,
    trigger: { kind: 'turnStart' },
    outcome: { kind: 'shield', maxHealthPercent: 10 },
  };
}

export function PetCardEditor({
  card,
  pool,
  pools,
  atlases,
  port,
  ...modal
}: EditorProps & {
  card: PetCardDefinition | null;
  pool: string;
  pools: PetCardPoolDefinition[];
  atlases: PetCardAtlasDefinition[];
  port: AdminPetCardPort;
}) {
  const [draft, setDraft] = useState<PetCardDefinition>(
    () =>
      card ?? {
        id: '',
        name: '',
        grade: 'common',
        battle: initialPetCardBattle('common'),
        stats: { health: 1 },
        artKey: atlases[0]?.id ?? '',
        artTile: 0,
        artPortrait: atlases[0]?.portrait ?? false,
        sortOrder: 100,
        version: null,
        poolIds: pool ? [pool] : [],
      },
  );
  const edit = (fields: Partial<PetCardDefinition>) => setDraft((old) => ({ ...old, ...fields }));
  const atlas = atlases.find(({ id }) => id === draft.artKey);
  return (
    <EditorFrame
      {...modal}
      bodyClassName={styles.editorBody ?? ''}
      title={card ? '编辑卡牌' : '新增卡牌'}
      onSubmit={(signal) => port.saveCard(draft, signal)}
    >
      <div className={styles.fields}>
        <Field
          label="卡牌编号"
          value={draft.id}
          readOnly={!!card}
          required
          pattern="[A-Za-z][A-Za-z0-9_\-]{0,47}"
          onChange={(e) => edit({ id: e.target.value })}
        />
        <Field
          label="卡牌名称"
          value={draft.name}
          required
          maxLength={80}
          onChange={(e) => edit({ name: e.target.value })}
        />
        <Choice
          label="品质"
          value={draft.grade}
          options={grades}
          onChange={(grade) => {
            const next = grade as PetCardGrade;
            edit({ grade: next, battle: initialPetCardBattle(next) });
          }}
        />
        <Field
          label="排序"
          value={draft.sortOrder}
          min={0}
          max={1000000}
          type="number"
          required
          onChange={(e) => edit({ sortOrder: Number(e.target.value) })}
        />
      </div>
      <section aria-label="基础属性" className={styles.group}>
        <h3>基础属性</h3>
        <div className={styles.fields}>
          {stats.map((stat) => (
            <Field
              key={stat}
              label={petCardStatLabels[stat]}
              type="number"
              min={stat === 'health' ? 1 : 0}
              max={1000000}
              required={stat === 'health'}
              value={draft.stats[stat] ?? ''}
              onChange={(event) => {
                const value = event.target.value;
                setDraft((old) => {
                  const next = { ...old.stats };
                  if (!value && stat !== 'health') delete next[stat];
                  else next[stat] = Number(value);
                  return { ...old, stats: next };
                });
              }}
            />
          ))}
        </div>
      </section>
      <section aria-label="图集" className={styles.group}>
        <h3>图集</h3>
        <div className={styles.fields}>
          <Choice
            label="选择图集"
            value={draft.artKey}
            options={atlases.map(({ id, name }) => ({ value: id, label: name }))}
            onChange={(artKey) =>
              edit({
                artKey,
                artPortrait: atlases.find(({ id }) => id === artKey)?.portrait ?? false,
              })
            }
          />
          <Choice
            label="图集格位"
            value={String(draft.artTile)}
            options={slots}
            onChange={(slot) => edit({ artTile: Number(slot) })}
          />
        </div>
        {atlas && <AtlasPreview key={atlas.id} atlas={atlas} slot={draft.artTile} />}
      </section>
      <section aria-label="对战能力" className={styles.group}>
        <h3>对战能力</h3>
        <PetCardBattleFields
          grade={draft.grade}
          value={draft.battle}
          onChange={(battle) => edit({ battle })}
        />
      </section>
      <section aria-label="所属卡池" className={styles.group}>
        <h3>所属卡池</h3>
        {pools.length === 0 && <p>暂无卡池，可先保存卡牌。</p>}
        <div className={styles.optionRows}>
          {pools.map(({ id, name }) => (
            <div className={styles.option} key={id}>
              <span>{name}</span>
              <Switch
                label={`加入${name}`}
                checked={draft.poolIds.includes(id)}
                onCheckedChange={(checked) =>
                  edit({
                    poolIds: checked
                      ? [...draft.poolIds, id]
                      : draft.poolIds.filter((entry) => entry !== id),
                  })
                }
              />
            </div>
          ))}
        </div>
      </section>
    </EditorFrame>
  );
}

function AtlasPreview({ atlas, slot }: { atlas: PetCardAtlasDefinition; slot: number }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  if (state === 'error')
    return (
      <div className={styles.preview} role="alert">
        图集读取失败{' '}
        <Button
          variant="secondary"
          onClick={() => {
            setState('loading');
            setAttempt((old) => old + 1);
          }}
        >
          重试图集
        </Button>
      </div>
    );
  return (
    <div className={styles.preview}>
      {state === 'loading' && <LoadingIndicator>正在加载图集…</LoadingIndicator>}
      <img
        key={attempt}
        src={atlas.url}
        alt={`${atlas.name}，5 列 2 行`}
        data-loaded={state === 'ready'}
        onLoad={() => setState('ready')}
        onError={() => setState('error')}
      />
      {state === 'ready' && (
        <div className={styles.atlasGrid} aria-hidden="true">
          <span style={{ gridColumn: (slot % 5) + 1, gridRow: Math.floor(slot / 5) + 1 }} />
        </div>
      )}
    </div>
  );
}
