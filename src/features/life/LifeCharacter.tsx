import { characters,talents } from '@/domain/life';
import { ArrowLeft,ArrowRight,Check,Shuffle,Sparkles,UserRound } from 'lucide-react';
import { properties } from './display';
import styles from './Life.module.css';


import type { LifeController } from './useLife';
const CONFIG = { points: 20, spirit: 5, pull: 10, min: 3, max: 3, allocate: 10 };
const propertyKeys = ['charm','intelligence','strength','money','spirit'] as const;
const gradeClass = (value:number) => styles[`grade-${Math.max(0,Math.min(3,value))}`];

export function LifeCharacter({ charactersPulled, characterId, setCharacterId, begin, pull, submitCharacter }: LifeController) {
return <div className={styles.container}><section className={styles.pickPanel}>
    <header className={styles.pickHeader}>
      <div><span className={styles.pickEyebrow}>名人模式</span><h2>选择你的前世</h2></div>
      <button type="button" className={styles.backButton} onClick={begin}><ArrowLeft size={16} aria-hidden="true" />返回模式</button>
    </header>
    {!charactersPulled.length ? <div className={styles.drawStage}>
      <div className={styles.characterDeck} aria-hidden="true">{[0, 1, 2].map(index => <div key={index} className={styles.cardBack}><UserRound size={36} strokeWidth={1.2} /></div>)}</div>
      <button type="button" className={`${styles.primary} ${styles.drawButton}`} onClick={pull}><Shuffle size={18} aria-hidden="true" />抽取名人<ArrowRight size={18} aria-hidden="true" /></button>
    </div> : <>
      <div className={styles.pickStatus}><h3>前世人选</h3><span>已选 <b>{characterId ? 1 : 0}</b> / 1</span></div>
      <fieldset className={styles.celebrityGrid}>
        <legend className={styles.visuallyHidden}>选择一位名人</legend>
        {charactersPulled.map((id, index) => {
          const character = characters.get(id)!;
          const values = { charm: character.property.CHR, intelligence: character.property.INT, strength: character.property.STR, money: character.property.MNY, spirit: CONFIG.spirit };
          return <label key={id} className={styles.celebrityOption}>
            <input type="radio" name="life-character" value={id} checked={characterId === id} onChange={() => setCharacterId(id)} aria-label={character.name} />
            <div className={styles.celebrityCard}>
              <div className={styles.celebrityIdentity}>
                <span className={styles.celebrityEmblem} aria-hidden="true"><UserRound size={26} strokeWidth={1.5} /></span>
                <div><span>前世 · 0{index + 1}</span><h3>{character.name}</h3></div>
                <span className={styles.celebrityCheck} aria-hidden="true">{characterId === id && <Check size={15} />}</span>
              </div>
              <div className={styles.celebrityProperties}>{propertyKeys.map(key => <div key={key}>
                <span>{properties[key]}</span><b>{values[key]}</b>
                <span className={styles.celebrityMeter} aria-hidden="true"><i style={{ width: `${Math.max(0, Math.min(100, values[key] * 10))}%` }} /></span>
              </div>)}</div>
              <div className={styles.celebrityTalentHeading}><Sparkles size={14} aria-hidden="true" /><span>天赋</span><small>{character.talent.length} 项</small></div>
              <ul className={styles.celebrityTalents}>{character.talent.map(talentId => {
                const talent = talents.get(talentId);
                return talent ? <li key={talentId}><span className={`${styles.celebrityGrade} ${gradeClass(talent.grade)}`} aria-hidden="true" /><div><strong>{talent.name}</strong><p>{talent.description}</p></div></li> : null;
              })}</ul>
            </div>
          </label>;
        })}
      </fieldset>
      <footer className={`${styles.pickFooter} ${styles.celebrityFooter}`}>
        <span aria-live="polite">{characterId ? <>此世前身 <b>{characters.get(characterId)?.name}</b></> : '尚未选择'}</span>
        <button type="button" disabled={!characterId} className={characterId ? styles.primary : styles.disabled} onClick={submitCharacter}>开始新人生<ArrowRight size={16} aria-hidden="true" /></button>
      </footer>
    </>}
  </section></div>;

}
