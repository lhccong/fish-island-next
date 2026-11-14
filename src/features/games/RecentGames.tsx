import { ChartCandlestick, Grid3X3, RotateCcw, Sprout, ScanFace } from 'lucide-react';
import styles from './GameCatalog.module.css';

export type CatalogGame = 'farm' | 'life' | 'stock' | 'gomoku' | 'undercover';
const catalogGames = ['farm', 'life', 'stock', 'gomoku', 'undercover'] as const;
export function RecentGames({
  recent,
  onPlay,
}: {
  recent: Readonly<Record<CatalogGame, boolean>>;
  onPlay: (game: CatalogGame) => void;
}) {
  const count = catalogGames.filter((game) => recent[game]).length;
  return (
    <section className={styles.recent} aria-labelledby="recent-games-title">
      <div className={styles.heading}>
        <h2 id="recent-games-title">最近玩过</h2>
        <span>{count ? `共${count}款` : '等你来玩'}</span>
      </div>
      {count ? (
        <div className={styles.recentGames}>
          {catalogGames
            .filter((game) => recent[game])
            .map((game) => {
              const Icon = {
                farm: Sprout,
                life: RotateCcw,
                stock: ChartCandlestick,
                gomoku: Grid3X3,
                undercover: ScanFace,
              }[game];
              return (
                <button
                  key={game}
                  type="button"
                  className={styles.recentGame}
                  onClick={() => onPlay(game)}
                >
                  <span className={styles.icon}>
                    <Icon size={28} aria-hidden="true" />
                  </span>
                  <span>
                    {
                      {
                        farm: '摸鱼农场',
                        life: '人生重开模拟器',
                        stock: '摸鱼股市',
                        gomoku: '五子棋',
                        undercover: '谁是卧底',
                      }[game]
                    }
                  </span>
                  <small>再玩一次</small>
                </button>
              );
            })}
        </div>
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
  );
}
