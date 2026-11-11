import type { ProfileState,Properties } from '@/domain/life';
import { judge,judgeGradeByValue,talents } from '@/domain/life';
import { Check } from 'lucide-react';
import { judgeNames,properties } from './display';
import styles from './Life.module.css';


const propertyKeys = ['charm', 'intelligence', 'strength', 'money', 'spirit'] as const;
const gradeClass = (value: number) => styles[`grade-${Math.max(0, Math.min(3, value))}`];

export const TalentCard = ({ id, selected, onClick }: { id: number; selected?: boolean; onClick?: () => void }) => {
  const talent = talents.get(id);
  if (!talent) return null;
  return <button type="button" aria-pressed={onClick ? !!selected : undefined} className={`${styles.talent} ${gradeClass(talent.grade)} ${selected ? styles.selected : ''}`} onClick={onClick}>
    {selected && <Check size={18} className={styles.selectionMark} aria-hidden="true" />}
    <strong>{talent.name}</strong><span>{talent.description}</span>
  </button>;
};

export const PropertyList = ({ values, includeAge = false, living = false }: { values: Properties; includeAge?: boolean; living?: boolean }) => (
  <div className={styles.propertyGrid}>
    {([...propertyKeys, ...(includeAge ? ['age' as const] : [])]).map(key => (
      <div key={key} className={`${styles.property} ${gradeClass(judgeGradeByValue(key, values[key]))}`}>
        <span>{key === 'age' && living ? '年龄' : properties[key]}</span><b>{values[key]}</b>
        <small>{key === 'age' && living ? (values.age === 0 ? '出生' : '岁') : judgeNames[key]![judge(key, values[key])]}</small>
      </div>
    ))}
  </div>
);

export const Home = ({ profile, onStart, onAchievements }: { profile: ProfileState; onStart: () => void; onAchievements: () => void }) => (
  <section className={styles.home}>
    <div className={styles.kicker}>摸鱼岛 · 本地人生模拟器</div>
    <h1>人生重开模拟器</h1><p>这垃圾人生一秒也不想待了</p>
    <button type="button" className={styles.primary} onClick={onStart}>立即重开</button>
    <div className={styles.homeStats}><span>已重开 <b>{profile.times}</b> 次</span><span>已解锁成就 <b>{profile.achievements.size}</b></span><button type="button" className={styles.textButton} onClick={onAchievements}>查看成就</button></div>
  </section>
);

