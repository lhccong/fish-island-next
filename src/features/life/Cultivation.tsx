import type {
  Allocation,
  CultivationGame,
  CultivationLog,
  CultivationResult,
  ProfileState,
} from '@/domain/life';
import {
  achievements,
  cultivationEvents,
  cultivationTalents,
  finishCultivation,
  nextCultivation,
  realms,
  startCultivation,
} from '@/domain/life';
import { ArrowLeft, Check, Mountain } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CultivationAlloc } from './CultivationAlloc';
import { CultivationPick } from './CultivationPick';
import { CultivationPlay } from './CultivationPlay';
import { CultivationSummary } from './CultivationSummary';
import styles from './Life.module.css';

const emptyAllocation = (): Allocation => ({
  charm: 0,
  intelligence: 0,
  strength: 0,
  money: 0,
  spirit: 0,
});
type Speed = 'manual' | 'auto' | 'double';

function useCultivation({
  profile,
  onFinish,
}: {
  profile: ProfileState;
  onExit: () => void;
  onFinish: (profile: ProfileState) => void;
}) {
  const [step, setStep] = useState<'pick' | 'alloc' | 'play' | 'summary'>('pick');
  const [drawn, setDrawn] = useState<number[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [allocation, setAllocation] = useState<Allocation>(emptyAllocation);
  const [game, setGame] = useState<CultivationGame>();
  const [logs, setLogs] = useState<CultivationLog[]>([]);
  const [speed, setSpeed] = useState<Speed>('manual');
  const [error, setError] = useState('');
  const gameRef = useRef<CultivationGame | undefined>(undefined);
  const savedRef = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);
  const remaining = 20 - Object.values(allocation).reduce((sum, value) => sum + value, 0);
  const unlocked = game
    ? Array.from(game.achievements).filter((id) => cultivationEvents.has(id))
    : [];

  const appendResult = useCallback((result: CultivationResult, fresh = false) => {
    gameRef.current = result.state;
    setGame(result.state);
    const nextLogs: CultivationLog[] = [
      ...result.logs,
      ...result.achievements.map((id) => ({
        age: result.state.props.current.age,
        text: `[成就] ${achievements.get(id)?.name}：${achievements.get(id)?.description}`,
        kind: 'good' as const,
      })),
    ];
    setLogs((previous) => (fresh ? nextLogs : [...previous, ...nextLogs]));
    if (result.state.cultivation.ending) setSpeed('manual');
  }, []);

  const advance = useCallback(() => {
    const current = gameRef.current;
    if (!current || current.cultivation.ending || error) return;
    try {
      appendResult(nextCultivation(current, profile));
    } catch (cause) {
      console.error('Cultivation progression failed', cause);
      setSpeed('manual');
      setError('修行推进失败，已暂停。');
    }
  }, [appendResult, error, profile]);
  useEffect(() => {
    if (speed === 'manual' || step !== 'play' || !game || game.cultivation.ending || error) return;
    const timer = window.setTimeout(advance, speed === 'double' ? 275 : 550);
    return () => window.clearTimeout(timer);
  }, [advance, error, game, speed, step]);
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const start = () => {
    if (remaining !== 0 || picked.length !== 3) return;
    try {
      appendResult(startCultivation(profile, allocation, picked), true);
      setError('');
      setStep('play');
    } catch (cause) {
      console.error('Cultivation start failed', cause);
      setError('修仙开局失败，请检查属性分配。');
    }
  };
  const finish = () => {
    if (!game?.cultivation.ending || savedRef.current) return;
    savedRef.current = true;
    onFinish(finishCultivation(game, profile));
  };
  const talentCard = (id: number, selectable: boolean) => {
    const talent = cultivationTalents.find((item) => item.id === id)!;
    const content = (
      <>
        <strong>{talent.name}</strong>
        <span>{talent.description}</span>
      </>
    );
    return selectable ? (
      <button
        type="button"
        key={id}
        aria-pressed={picked.includes(id)}
        className={`${styles.talent} ${styles[`grade-${talent.grade}`]} ${picked.includes(id) ? styles.selected : ''}`}
        onClick={() =>
          setPicked((previous) =>
            previous.includes(id)
              ? previous.filter((value) => value !== id)
              : previous.length < 3
                ? [...previous, id]
                : previous,
          )
        }
      >
        {picked.includes(id) && (
          <Check size={18} className={styles.selectionMark} aria-hidden="true" />
        )}
        {content}
      </button>
    ) : (
      <div
        key={id}
        className={`${styles.talent} ${styles.cultivationTalentReadOnly} ${styles[`grade-${talent.grade}`]}`}
      >
        {content}
      </div>
    );
  };

  const controller = {
    step,
    setStep,
    drawn,
    setDrawn,
    picked,
    setPicked,
    allocation,
    setAllocation,
    remaining,
    start,
    game,
    logs,
    logRef,
    speed,
    setSpeed,
    error,
    advance,
    profile,
    unlocked,
    finish,
    talentCard,
  };
  return controller;
}
export type CultivationController = ReturnType<typeof useCultivation>;
export default function Cultivation(props: {
  profile: ProfileState;
  onExit: () => void;
  onFinish: (profile: ProfileState) => void;
}) {
  const controller = useCultivation(props);
  const { step, setStep, error, game } = controller;
  const { onExit } = props;
  return (
    <div className={styles.container}>
      <section className={styles.cultivationPanel}>
        <header className={styles.pickHeader}>
          <div>
            <span className={styles.pickEyebrow}>修仙模式</span>
            <h2>
              {step === 'pick'
                ? '仙途天赋'
                : step === 'alloc'
                  ? '先天属性'
                  : step === 'summary'
                    ? '此世仙途'
                    : '修行纪事'}
            </h2>
          </div>
          {step === 'pick' || step === 'alloc' ? (
            <button
              type="button"
              className={styles.backButton}
              onClick={step === 'alloc' ? () => setStep('pick') : onExit}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              {step === 'alloc' ? '返回天赋' : '切换模式'}
            </button>
          ) : (
            <span className={styles.cultivationWorld}>
              <Mountain size={16} aria-hidden="true" />
              {realms[game!.cultivation.realm]!.world}
            </span>
          )}
        </header>
        {error && (
          <div role="alert" className={styles.cultivationError}>
            {error}
            <button type="button" className={styles.textButton} onClick={onExit}>
              返回模式选择
            </button>
          </div>
        )}

        {step === 'pick' && <CultivationPick {...controller} />}

        {step === 'alloc' && <CultivationAlloc {...controller} />}

        {step === 'play' && <CultivationPlay {...controller} />}

        {step === 'summary' && <CultivationSummary {...controller} />}
      </section>
    </div>
  );
}
