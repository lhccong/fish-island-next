import type { Allocation, GameState, ProfileState, Properties } from '@/domain/life';
import {
  characters,
  end as endGame,
  next as nextYear,
  pull as pullTalents,
  pick as replaceTalents,
  start as startGame,
  summary as summarize,
  talents,
} from '@/domain/life';
import type { SetStateAction } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { readProfile, saveProfile } from './profile';

type Step =
  | 'home'
  | 'mode'
  | 'pick'
  | 'character'
  | 'alloc'
  | 'play'
  | 'summary'
  | 'achievements'
  | 'cultivation';
type Mode = 'classic' | 'celebrity';
type PlaybackMode = 'manual' | 'auto' | 'double';
type Log = {
  age: number;
  events: number[];
  talents: number[];
  achievements: number[];
  props: Properties;
};

const CONFIG = { points: 20, spirit: 5, pull: 10, min: 3, max: 3, allocate: 10 };
export function useLife() {
  const [initial] = useState(readProfile);
  const [profile, updateProfile] = useState<ProfileState>(initial.profile);
  const [storageNotice, setStorageNotice] = useState(initial.notice);
  const setProfile = (update: SetStateAction<ProfileState>) => {
    const next = typeof update === 'function' ? update(profile) : update;
    updateProfile(next);
    setStorageNotice(saveProfile(next));
  };
  const [step, setStep] = useState<Step>('home');
  const [mode, setMode] = useState<Mode>('classic');
  const [pulled, setPulled] = useState<number[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [charactersPulled, setCharactersPulled] = useState<number[]>([]);
  const [characterId, setCharacterId] = useState<number>();
  const [allocation, setAllocation] = useState<Allocation>({
    charm: 0,
    intelligence: 0,
    strength: 0,
    money: 0,
    spirit: 0,
  });
  const [replaced, setReplaced] = useState<{ talents: Set<number>; chains: Map<number, number[]> }>(
    { talents: new Set(), chains: new Map() },
  );
  const [game, setGame] = useState<GameState>();
  const [logs, setLogs] = useState<Log[]>([]);
  const [summary, setSummary] = useState(0);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('manual');
  const gameRef = useRef<GameState | undefined>(undefined);
  const [playError, setPlayError] = useState('');
  const [achievementFilter, setAchievementFilter] = useState('all');
  const [achievementQuery, setAchievementQuery] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);
  const pickedPointBonus = useMemo(
    () => Array.from(replaced.talents).reduce((sum, id) => sum + (talents.get(id)?.points || 0), 0),
    [replaced],
  );
  const remaining =
    CONFIG.points +
    pickedPointBonus -
    Object.values(allocation).reduce((sum, value) => sum + value, 0);

  const resetRound = () => {
    setPulled([]);
    setPicked(new Set());
    setCharactersPulled([]);
    setCharacterId(undefined);
    setAllocation({ charm: 0, intelligence: 0, strength: 0, money: 0, spirit: 0 });
    setReplaced({ talents: new Set(), chains: new Map() });
    setGame(undefined);
    gameRef.current = undefined;
    setLogs([]);
    setPlaybackMode('manual');
    setPlayError('');
  };
  const begin = () => {
    resetRound();
    setStep('mode');
  };
  const chooseMode = (nextMode: Mode) => {
    resetRound();
    setMode(nextMode);
    setStep(nextMode === 'classic' ? 'pick' : 'character');
  };
  const pull = () => {
    if (mode === 'classic')
      setPulled(
        pullTalents(
          {
            count: CONFIG.pull,
            rate: {
              base: new Map([
                [0, 889],
                [1, 100],
                [2, 10],
                [3, 1],
              ]),
              additions: {},
            },
          },
          profile,
        ),
      );
    else
      setCharactersPulled(
        Array.from(characters.keys())
          .sort(() => Math.random() - 0.5)
          .slice(0, 3),
      );
  };
  const submitTalents = () => {
    if (picked.size !== CONFIG.min) return;
    setReplaced(replaceTalents(picked).talents);
    setStep('alloc');
  };
  const submitCharacter = () => {
    if (!characterId) return;
    const character = characters.get(characterId)!;
    launchLife(
      {
        charm: character.property.CHR,
        intelligence: character.property.INT,
        strength: character.property.STR,
        money: character.property.MNY,
        spirit: CONFIG.spirit,
      },
      new Set(character.talent),
    );
  };
  const launchLife = (initialAllocation: Allocation, initialTalents: Set<number>) => {
    const result = startGame(profile, initialAllocation, initialTalents);
    setPlaybackMode('manual');
    setPlayError('');
    try {
      const birth = nextYear(result.state, profile);
      gameRef.current = birth.state;
      setGame(birth.state);
      setLogs([
        {
          ...birth,
          achievements: [...result.achievements, ...birth.achievements],
          props: birth.state.props.current,
        },
      ]);
    } catch (error) {
      gameRef.current = result.state;
      setGame(result.state);
      setPlayError('出生事件生成失败，请重新开始。');
      console.error('Life simulation failed', error);
    }
    setStep('play');
  };
  const start = () => {
    if (remaining !== 0) return;
    launchLife(
      {
        charm: allocation.charm,
        intelligence: allocation.intelligence,
        strength: allocation.strength,
        money: allocation.money,
        spirit: allocation.spirit,
      },
      replaced.talents,
    );
  };
  const next = useCallback(() => {
    const current = gameRef.current;
    if (!current || current.life <= 0 || playError) return;
    try {
      const result = nextYear(current, profile);
      gameRef.current = result.state;
      setGame(result.state);
      setLogs((prev) => [...prev, { ...result, props: result.state.props.current }]);
      if (result.end) setPlaybackMode('manual');
    } catch (error) {
      setPlaybackMode('manual');
      setPlayError('人生推进失败，已暂停。请重新开始。');
      console.error('Life simulation failed', error);
    }
  }, [profile, playError]);
  useEffect(() => {
    if (playbackMode === 'manual' || !game || game.life <= 0 || step !== 'play' || playError)
      return;
    const timer = window.setTimeout(next, playbackMode === 'double' ? 275 : 550);
    return () => window.clearTimeout(timer);
  }, [playbackMode, game, step, playError, next]);
  const goSummary = () => {
    if (!game || game.life > 0) return;
    const result = summarize(game, profile);
    setGame(result.state);
    setSummary(result.summary);
    setStep('summary');
  };
  const finish = (locked?: number[]) => {
    if (!game) return;
    const result = endGame(game, profile, mode === 'classic' ? locked : profile.locked);
    setProfile(result.profile);
    resetRound();
    setStep('home');
  };

  return {
    profile,
    storageNotice,
    setProfile,
    step,
    setStep,
    mode,
    pulled,
    picked,
    setPicked,
    charactersPulled,
    characterId,
    setCharacterId,
    allocation,
    setAllocation,
    replaced,
    game,
    logs,
    summary,
    playbackMode,
    setPlaybackMode,
    playError,
    achievementFilter,
    setAchievementFilter,
    achievementQuery,
    setAchievementQuery,
    logRef,
    pickedPointBonus,
    remaining,
    resetRound,
    begin,
    chooseMode,
    pull,
    submitTalents,
    submitCharacter,
    start,
    next,
    goSummary,
    finish,
  };
}
export type LifeController = ReturnType<typeof useLife>;
