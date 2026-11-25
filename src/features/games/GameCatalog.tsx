import { useState } from 'react';
import { WindowLauncher } from '@/shared/ui/WindowLauncher';
import { Sparkles, Sprout, Sun, ChartCandlestick, Grid3X3, Flame, Milk } from 'lucide-react';
import styles from './GameCatalog.module.css';
import { RecentGames, type CatalogGame } from './RecentGames';
import { DrawEntry } from './DrawEntry';
import { LandlordsEntry } from './LandlordsEntry';
import { UndercoverEntry } from './UndercoverEntry';
export function GameCatalog({
  onPlay,
  onDarkRoom,
  onMilkyWayIdle,
  onStock,
  onFarm,
  onGomoku,
  onUndercover,
  onDraw,
  onLandlords,
  onWindow,
}: {
  onPlay: () => void;
  onDarkRoom: () => void;
  onMilkyWayIdle: () => void;
  onStock: () => void;
  onFarm: () => void;
  onGomoku: () => void;
  onUndercover: () => void;
  onDraw: () => void;
  onLandlords: () => void;
  onWindow: (game: CatalogGame) => void;
}) {
  const [recent, setRecent] = useState<Record<CatalogGame, boolean>>(() => {
    const read = (game: CatalogGame) => {
      try {
        return localStorage.getItem(`fish-island:recent-${game}`) === 'true';
      } catch {
        return false;
      }
    };
    return {
      farm: read('farm'),
      life: read('life'),
      'dark-room': read('dark-room'),
      'milky-way-idle': read('milky-way-idle'),
      stock: read('stock'),
      gomoku: read('gomoku'),
      undercover: read('undercover'),
      draw: read('draw'),
      landlords: read('landlords'),
    };
  });
  const remember = (game: CatalogGame) => {
    setRecent((items) => ({ ...items, [game]: true }));
    try {
      localStorage.setItem(`fish-island:recent-${game}`, 'true');
    } catch {
      /* 存储受限不影响游戏入口。 */
    }
  };
  const playGame = (game: CatalogGame) => {
    remember(game);
    ({
      farm: onFarm,
      life: onPlay,
      'dark-room': onDarkRoom,
      'milky-way-idle': onMilkyWayIdle,
      stock: onStock,
      gomoku: onGomoku,
      undercover: onUndercover,
      draw: onDraw,
      landlords: onLandlords,
    })[game]();
  };
  const playFarm = () => playGame('farm');
  const play = () => playGame('life');
  const playStock = () => playGame('stock');
  const openWindow = (game: CatalogGame) => {
    remember(game);
    onWindow(game);
  };
  return (
    <div className={styles.catalog}>
      <RecentGames recent={recent} onPlay={playGame} />
      <section className={styles.recommendations} aria-labelledby="recommended-games-title">
        <div className={styles.heading}>
          <h2 id="recommended-games-title">每日一荐</h2>
          <span>发现另一种可能</span>
        </div>
        <div className={styles.cards}>
          <div className={styles.entry}>
            <button
              type="button"
              className={styles.stockCard}
              onClick={() => playGame('milky-way-idle')}
              aria-label="打开奶牛放置"
            >
              <div className={`${styles.stockArt} ${styles.milkyWayArt}`} aria-hidden="true">
                <Milk size={84} strokeWidth={1.25} />
                <span>Milky Way Idle</span>
              </div>
              <div className={styles.stockCaption}>
                <div>
                  <h3>奶牛放置</h3>
                  <p>多人放置 RPG · 采集、制作与战斗</p>
                </div>
              </div>
            </button>
            <WindowLauncher
              className={styles.windowLauncher ?? ''}
              label="独立窗口打开奶牛放置"
              onClick={() => openWindow('milky-way-idle')}
            />
          </div>
          <div className={styles.entry}>
            <button
              type="button"
              className={styles.stockCard}
              onClick={() => playGame('dark-room')}
              aria-label="打开小黑屋模拟器"
            >
              <div className={styles.stockArt} aria-hidden="true">
                <span>A DARK ROOM</span>
                <h3>
                  点燃火堆，
                  <br />
                  走出黑暗。
                </h3>
                <Flame size={100} strokeWidth={1} />
                <p>探索 · 生存 · 建造</p>
              </div>
              <div className={styles.stockCaption}>
                <div>
                  <span>单人文字冒险 · 本机存档</span>
                  <h3>小黑屋模拟器</h3>
                  <p>从一间小屋出发，探索荒野</p>
                </div>
              </div>
            </button>
            <WindowLauncher
              className={styles.windowLauncher ?? ''}
              label="独立窗口打开小黑屋模拟器"
              onClick={() => openWindow('dark-room')}
            />
          </div>
          <LandlordsEntry
            onPlay={() => playGame('landlords')}
            onWindow={() => openWindow('landlords')}
          />
          <DrawEntry onPlay={() => playGame('draw')} onWindow={() => openWindow('draw')} />
          <UndercoverEntry
            onPlay={() => playGame('undercover')}
            onWindow={() => openWindow('undercover')}
          />
          <div className={styles.entry}>
            <button
              type="button"
              className={styles.stockCard}
              onClick={() => playGame('gomoku')}
              aria-label="打开五子棋"
            >
              <div className={styles.stockArt} aria-hidden="true">
                <span>FISH ISLAND GOMOKU</span>
                <h3>
                  一人一手，
                  <br />
                  闲暇有对手。
                </h3>
                <Grid3X3 size={100} strokeWidth={1} />
                <p>联机对局 · 单机练习</p>
              </div>
              <div className={styles.stockCaption}>
                <div>
                  <span>好友房间 · 公共聊天邀请</span>
                  <h3>五子棋</h3>
                  <p>执黑先行，和岛友来一场五连对决</p>
                </div>
              </div>
            </button>
            <WindowLauncher
              className={styles.windowLauncher ?? ''}
              label="独立窗口打开五子棋"
              onClick={() => openWindow('gomoku')}
            />
          </div>
          <div className={styles.entry}>
            <button
              type="button"
              className={styles.stockCard}
              onClick={playFarm}
              aria-label="打开摸鱼农场"
            >
              <div className={styles.farmArt} aria-hidden="true">
                <span>FISH ISLAND FARM</span>
                <h3>
                  种点喜欢，
                  <br />
                  收点快乐。
                </h3>
                <div className={styles.miniField}>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <span key={n}>
                      <Sprout size={34} />
                    </span>
                  ))}
                </div>
              </div>
              <div className={styles.stockCaption}>
                <div>
                  <span>像素田园 · 种植收获 · 好友偷菜</span>
                  <h3>摸鱼农场</h3>
                  <p>照料一方田地，收获忙里偷闲的小确幸</p>
                </div>
              </div>
            </button>
            <WindowLauncher
              className={styles.windowLauncher ?? ''}
              label="独立窗口打开摸鱼农场"
              onClick={() => openWindow('farm')}
            />
          </div>
          <div className={styles.entry}>
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
              <div className={styles.stockCaption}>
                <div>
                  <span>文字冒险 · 经典 / 修仙 / 名人</span>
                  <h3>人生重开模拟器</h3>
                  <p>抽取天赋，开启你意想不到的一生</p>
                </div>
              </div>
            </button>
            <WindowLauncher
              className={styles.windowLauncher ?? ''}
              label="独立窗口打开人生重开模拟器"
              onClick={() => openWindow('life')}
            />
          </div>
          <div className={styles.entry}>
            <button
              type="button"
              className={styles.stockCard}
              onClick={playStock}
              aria-label="打开摸鱼股市"
            >
              <div className={styles.stockArt} aria-hidden="true">
                <span>FISH ISLAND EXCHANGE</span>
                <h3>
                  看清走势，
                  <br />
                  留下每一步。
                </h3>
                <ChartCandlestick size={100} strokeWidth={1} />
                <p>B 买入 · S 卖出</p>
              </div>
              <div className={styles.stockCaption}>
                <div>
                  <span>积分交易 · 五大指数 · 日 K 线</span>
                  <h3>摸鱼股市</h3>
                  <p>行情、持仓与买卖点，一目了然</p>
                </div>
              </div>
            </button>
            <WindowLauncher
              className={styles.windowLauncher ?? ''}
              label="独立窗口打开摸鱼股市"
              onClick={() => openWindow('stock')}
            />
          </div>
        </div>
        <p className={styles.note}>无需下载，即点即玩 · 联机游戏、农场与股市需登录</p>
      </section>
    </div>
  );
}
