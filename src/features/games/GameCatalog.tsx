import { useState } from 'react';
import { ChevronRight, RotateCcw, Sparkles, Sprout, Sun } from 'lucide-react';
import styles from './GameCatalog.module.css';
export function GameCatalog({ onPlay }: { onPlay: () => void }) {
  const [recent, setRecent] = useState(() => {
    try {
      return localStorage.getItem('fish-island:recent-life') === 'true';
    } catch {
      return false;
    }
  });
  const play = () => {
    setRecent(true);
    try {
      localStorage.setItem('fish-island:recent-life', 'true');
    } catch {
      /* 存储受限时仍可开始。 */
    }
    onPlay();
  };
  return (
    <div className={styles.catalog}>
      <section className={styles.recent} aria-labelledby="recent-games-title">
        <div className={styles.heading}>
          <h2 id="recent-games-title">最近玩过</h2>
          <span>
            {recent ? '共1款' : '等你来玩'}
            <ChevronRight size={14} aria-hidden="true" />
          </span>
        </div>
        {recent ? (
          <button type="button" className={styles.recentGame} onClick={play}>
            <span className={styles.icon}>
              <RotateCcw size={28} aria-hidden="true" />
            </span>
            <span>人生重开模拟器</span>
            <small>再玩一次</small>
          </button>
        ) : (
          <div className={styles.empty}>
            <span className={styles.icon}>
              <RotateCcw size={26} aria-hidden="true" />
            </span>
            <div>
              <p>你的下一段人生，从这里开始</p>
              <span>玩过的游戏会留在这里，方便下次找到。</span>
            </div>
          </div>
        )}
      </section>
      <section className={styles.recommendations} aria-labelledby="recommended-games-title">
        <div className={styles.heading}>
          <h2 id="recommended-games-title">每日一荐</h2>
          <span>发现另一种可能</span>
        </div>
        <button
          type="button"
          className={styles.card}
          onClick={play}
          aria-label="打开人生重开模拟器"
        >
          <div className={styles.art} aria-hidden="true">
            <span className={styles.artLabel}>LIFE RESTART</span>
            <div className={styles.artTitle}>
              这次，
              <br />
              换个活法。
            </div>
            <div className={styles.portal}>
              <Sun size={44} strokeWidth={1} />
              <span className={styles.path} />
              <Sprout size={40} strokeWidth={1.5} />
            </div>
            <span className={styles.floating}>
              <Sparkles size={14} />
              天赋 +3
            </span>
            <span className={styles.orbit} />
            <span className={styles.artSubtitle}>平凡、传奇，还是问道长生？</span>
          </div>
          <div className={styles.caption}>
            <div>
              <span>文字冒险 · 经典 / 修仙 / 名人</span>
              <h3>人生重开模拟器</h3>
              <p>抽取天赋，开启你意想不到的一生</p>
            </div>
            <span className={styles.play}>立即玩</span>
          </div>
        </button>
        <p className={styles.note}>无需下载，即点即玩 · 成就保存在当前浏览器</p>
      </section>
    </div>
  );
}
