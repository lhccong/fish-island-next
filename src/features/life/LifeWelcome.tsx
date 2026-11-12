import type { ProfileState } from '@/domain/life';
import styles from './Life.module.css';

export const Home = ({
  profile,
  onStart,
  onAchievements,
}: {
  profile: ProfileState;
  onStart: () => void;
  onAchievements: () => void;
}) => (
  <section className={styles.home}>
    <div className={styles.kicker}>摸鱼岛 · 本地人生模拟器</div>
    <h1>人生重开模拟器</h1>
    <p>这垃圾人生一秒也不想待了</p>
    <button type="button" className={styles.primary} onClick={onStart}>
      立即重开
    </button>
    <div className={styles.homeStats}>
      <span>
        已重开 <b>{profile.times}</b> 次
      </span>
      <span>
        已解锁成就 <b>{profile.achievements.size}</b>
      </span>
      <button type="button" className={styles.textButton} onClick={onAchievements}>
        查看成就
      </button>
    </div>
  </section>
);
