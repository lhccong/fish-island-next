import { achievements,events,talents } from '@/domain/life';
import { ArrowLeft,BookOpen,Check,LockKeyhole,Medal,RotateCcw,Search,Sparkles,Trophy } from 'lucide-react';
import styles from './Life.module.css';


import type { LifeController } from './useLife';
const gradeClass = (value:number) => styles[`grade-${Math.max(0,Math.min(3,value))}`];

export function LifeAchievements({ profile, setStep, achievementFilter, setAchievementFilter, achievementQuery, setAchievementQuery }: LifeController) {
  const unlockedCount = Array.from(achievements.keys()).filter(id => profile.achievements.has(id)).length;
  const progress = Math.round(unlockedCount / achievements.size * 100);
  const visibleAchievements = Array.from(achievements.values()).filter(item => {
    const unlocked = profile.achievements.has(item.id);
    if (achievementFilter === 'unlocked' && !unlocked || achievementFilter === 'locked' && unlocked) return false;
    const searchable = item.hide && !unlocked ? '隐藏成就 尚未揭晓' : `${item.name} ${item.description}`;
    return searchable.includes(achievementQuery.trim());
  }).sort((a, b) => Number(profile.achievements.has(b.id)) - Number(profile.achievements.has(a.id)));
  return <div className={styles.container}><section className={styles.achievementsPanel}>
    <header className={styles.pickHeader}>
      <div><span className={styles.pickEyebrow}>人生图鉴</span><h2>成就与统计</h2></div>
      <button type="button" className={styles.backButton} onClick={() => setStep('home')}><ArrowLeft size={16} aria-hidden="true" />返回首页</button>
    </header>
    <div className={styles.collectionStats}>
      {[
        { label: '重开次数', value: profile.times, total: null, icon: RotateCcw },
        { label: '天赋收集', value: profile.talents.size, total: talents.size, icon: Sparkles },
        { label: '事件收集', value: profile.events.size, total: events.size, icon: BookOpen },
        { label: '成就解锁', value: unlockedCount, total: achievements.size, icon: Trophy },
      ].map(({ label, value, total, icon: Icon }) => <div key={label} className={styles.collectionStat}>
        <span><Icon size={17} aria-hidden="true" />{label}</span><div><b>{value}</b><small>{total === null ? '次' : `/ ${total}`}</small></div>
      </div>)}
    </div>
    <div className={styles.collectionProgress}>
      <div><span>成就收集进度</span><b>{progress}%</b></div>
      <progress aria-label="成就收集进度" max={achievements.size} value={unlockedCount} />
    </div>
    <div className={styles.achievementToolbar}>
      <fieldset className={styles.achievementFilters} aria-label="成就状态">
        {[
          { value: 'all', label: '全部', count: achievements.size },
          { value: 'unlocked', label: '已解锁', count: unlockedCount },
          { value: 'locked', label: '未解锁', count: achievements.size - unlockedCount },
        ].map(option => <label key={option.value}><input type="radio" name="achievement-filter" value={option.value} checked={achievementFilter === option.value} onChange={() => setAchievementFilter(option.value)} /><span>{option.label}<b>{option.count}</b></span></label>)}
      </fieldset>
      <label className={styles.achievementSearch}><Search size={16} aria-hidden="true" /><input type="search" aria-label="搜索成就" placeholder="搜索成就" value={achievementQuery} onChange={event => setAchievementQuery(event.target.value)} /></label>
    </div>
    <div className={styles.achievementResults} aria-live="polite">共 {visibleAchievements.length} 项成就</div>
    <div className={styles.achievementGrid}>{visibleAchievements.map(item => {
      const unlocked = profile.achievements.has(item.id);
      const hidden = item.hide && !unlocked;
      const Icon = unlocked ? Trophy : hidden ? LockKeyhole : Medal;
      return <article key={item.id} className={`${styles.achievementCard} ${unlocked ? styles.achievementUnlocked : ''} ${hidden ? '' : gradeClass(item.grade)}`}>
        <div className={styles.achievementIcon}><Icon size={23} strokeWidth={1.6} aria-hidden="true" /></div>
        <div className={styles.achievementBody}>
          <h3>{hidden ? '隐藏成就' : item.name}</h3>
          <p>{hidden ? '尚未揭晓' : item.description}</p>
          <div className={styles.achievementMeta}><span>{hidden ? '未知' : ['普通', '稀有', '史诗', '传说'][item.grade]}</span><span>{unlocked ? <Check size={12} aria-hidden="true" /> : <LockKeyhole size={11} aria-hidden="true" />}{unlocked ? '已解锁' : '未解锁'}</span></div>
        </div>
      </article>;
    })}</div>
    {!visibleAchievements.length && <div className={styles.achievementEmpty}><Search size={28} aria-hidden="true" /><h3>暂无匹配成就</h3><button type="button" className={styles.textButton} onClick={() => { setAchievementQuery(''); setAchievementFilter('all'); }}>查看全部成就</button></div>}
  </section></div>;

}
