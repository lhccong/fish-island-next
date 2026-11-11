import { ArrowUpRight, RotateCcw, Sparkles } from 'lucide-react';
import styles from './GameCatalog.module.css';

export function GameCatalog({ lifeGameUrl }: { lifeGameUrl: string }) {
  return (
    <section className={styles.catalog} aria-label="游戏目录">
      <p className={styles.eyebrow}>摸鱼时间 · 换一种人生</p>
      <h2>发现好玩的</h2>
      <p className={styles.intro}>给日常按下暂停，来一场轻松的文字冒险。</p>
      <a
        className={styles.card}
        href={lifeGameUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="打开人生重开模拟器（新窗口）"
      >
        <div className={styles.art} aria-hidden="true">
          <RotateCcw size={56} strokeWidth={1.5} />
          <span>RESTART</span>
        </div>
        <div className={styles.details}>
          <span className={styles.tag}>
            <Sparkles size={14} aria-hidden="true" />
            文字模拟
          </span>
          <h3>人生重开模拟器</h3>
          <p>如果人生可以重来，你会怎么选？抽取天赋、分配属性，体验另一段充满未知的人生。</p>
          <span className={styles.action}>
            开始重开
            <ArrowUpRight size={18} aria-hidden="true" />
          </span>
          <small>在新窗口打开旧摸鱼岛游戏</small>
        </div>
      </a>
    </section>
  );
}
