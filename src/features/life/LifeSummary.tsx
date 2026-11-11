import styles from './Life.module.css';


import { PropertyList,TalentCard } from './LifeParts';
import type { LifeController } from './useLife';

export function LifeSummary({ profile, setProfile, mode, replaced, game, summary, finish }: LifeController) {
return <div className={styles.container}><section className={styles.panel}>
    <div className={styles.sectionHeading}><span>人生总结</span><b>总评 {summary}</b></div>
    <PropertyList values={game!.props.highest} includeAge /><p className={styles.muted}>{mode === 'classic' ? '选择一个天赋，让它陪你走过下一世。' : '名人天赋不可锁定。'}</p>
    <div className={styles.talentGrid}>{Array.from(replaced.talents).map(id => <TalentCard key={id} id={id} selected={!!profile.locked?.includes(id)} onClick={() => mode === 'classic' && setProfile(prev => ({ ...prev, locked: prev.locked?.includes(id) ? prev.locked.filter(item => item !== id) : [id] }))} />)}</div>
    <button type="button" className={styles.primary} onClick={() => finish(profile.locked)}>再次重开</button>
  </section></div>;

}
