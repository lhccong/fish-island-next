import {
  petCardActions,
  type PetCardBattleEffect,
  type PetCardDefinition,
  type PetCardGrade,
} from '@/domain/pet';
import { Switch } from '@/shared/ui/Switch';
import { Choice, Field } from './fields';
import styles from './PetCardPoolSettings.module.css';

const triggers = {
  turnStart: '回合开始',
  firstAttack: '首次攻击',
  firstIncomingAttack: '首次受到攻击',
  firstHit: '首次命中',
  firstCriticalHit: '首次暴击',
  firstIncomingCriticalHit: '首次受到暴击时',
  afterFirstIncomingCriticalHit: '首次受到暴击后',
  healthBelowAtTurnStart: '回合开始且生命低于阈值',
};
const outcomes = {
  heal: '回血',
  shield: '护盾',
  statBoost: '基础属性提升',
  criticalChanceBoost: '暴击率提升',
  accuracyBoost: '命中率提升',
  outgoingDamageBoost: '伤害提升',
  incomingDamageReduction: '减伤',
  guaranteedCriticalHit: '必定暴击',
};
const boostStats = { attack: '攻击', defense: '防御', speed: '速度' } as const;
const boostKeys = Object.keys(boostStats) as (keyof typeof boostStats)[];
const options = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));
type Effect = PetCardBattleEffect;
type Outcome = Effect['outcome'];

function newOutcome(kind: Outcome['kind']): Outcome {
  switch (kind) {
    case 'guaranteedCriticalHit':
      return { kind };
    case 'statBoost':
      return { kind, stats: ['attack'], percent: 10 };
    case 'criticalChanceBoost':
    case 'accuracyBoost':
      return { kind, percentagePoints: 10 };
    case 'heal':
    case 'shield':
      return { kind, maxHealthPercent: 10 };
    default:
      return { kind, percent: 10 };
  }
}

export function PetCardBattleFields({
  grade,
  value,
  onChange,
}: {
  grade: PetCardGrade;
  value: PetCardDefinition['battle'];
  onChange: (value: PetCardDefinition['battle']) => void;
}) {
  if (value.kind === 'action')
    return (
      <Choice
        label="对战动作"
        value={value.action}
        options={options({ attack: '攻击', dodge: '闪避' })}
        onChange={(action) =>
          onChange(action === 'dodge' ? petCardActions.dodge : petCardActions.attack)
        }
      />
    );
  const { trigger, outcome } = value;
  const edit = (fields: Partial<Effect>) => onChange({ ...value, ...fields });
  return (
    <>
      <Field
        label="技能名称"
        value={value.name}
        required
        maxLength={80}
        onChange={(e) => edit({ name: e.target.value })}
      />
      {grade !== 'fine' && (
        <>
          <Choice
            label="技能效果"
            value={outcome.kind}
            options={options(outcomes)}
            onChange={(kind) => {
              const next = newOutcome(kind as Outcome['kind']);
              edit(
                next.kind === 'guaranteedCriticalHit'
                  ? { outcome: next, trigger: { kind: 'firstHit' } }
                  : { outcome: next },
              );
            }}
          />
          {outcome.kind !== 'guaranteedCriticalHit' && (
            <Choice
              label="下一回合触发条件"
              value={trigger.kind}
              options={options(triggers)}
              onChange={(kind) =>
                edit({
                  trigger:
                    kind === 'healthBelowAtTurnStart'
                      ? { kind, thresholdPercent: 30 }
                      : {
                          kind: kind as Exclude<
                            Effect['trigger']['kind'],
                            'healthBelowAtTurnStart'
                          >,
                        },
                })
              }
            />
          )}
        </>
      )}
      {trigger.kind === 'healthBelowAtTurnStart' && (
        <Field
          label="生命阈值（%）"
          type="number"
          required
          min={1}
          max={100}
          value={trigger.thresholdPercent}
          onChange={(e) =>
            edit({ trigger: { ...trigger, thresholdPercent: Number(e.target.value) } })
          }
        />
      )}
      {outcome.kind === 'statBoost' && (
        <div role="group" aria-label="提升属性" className={styles.optionRows}>
          {boostKeys.map((key) => (
            <div className={styles.option} key={key}>
              <span>{boostStats[key]}</span>
              <Switch
                label={`提升${boostStats[key]}`}
                checked={outcome.stats.includes(key)}
                onCheckedChange={(checked) =>
                  edit({
                    outcome: {
                      ...outcome,
                      stats: checked
                        ? [...outcome.stats, key]
                        : outcome.stats.filter((stat) => stat !== key),
                    },
                  })
                }
              />
            </div>
          ))}
        </div>
      )}
      <PetCardEffectAmount outcome={outcome} onChange={(next) => edit({ outcome: next })} />
    </>
  );
}

function PetCardEffectAmount({
  outcome,
  onChange,
}: {
  outcome: Outcome;
  onChange: (outcome: Outcome) => void;
}) {
  if ('percentagePoints' in outcome)
    return (
      <Field
        label="提升（百分点）"
        required
        type="number"
        min={1}
        max={100}
        value={outcome.percentagePoints}
        onChange={(e) => onChange({ ...outcome, percentagePoints: Number(e.target.value) })}
      />
    );
  if ('maxHealthPercent' in outcome)
    return (
      <Field
        label="最大生命比例（%）"
        required
        type="number"
        min={1}
        max={100}
        value={outcome.maxHealthPercent}
        onChange={(e) => onChange({ ...outcome, maxHealthPercent: Number(e.target.value) })}
      />
    );
  if ('percent' in outcome)
    return (
      <Field
        label="效果比例（%）"
        required
        type="number"
        min={1}
        max={100}
        value={outcome.percent}
        onChange={(e) => onChange({ ...outcome, percent: Number(e.target.value) })}
      />
    );
  return null;
}
