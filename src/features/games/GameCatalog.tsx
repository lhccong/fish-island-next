import { useState } from 'react';
import { WindowLauncher } from '@/shared/ui/WindowLauncher';
import { RotateCcw, Sparkles, Sprout, Sun, ChartCandlestick } from 'lucide-react';
import styles from './GameCatalog.module.css';
export function GameCatalog({
  onPlay,
  onStock,
  onFarm,
  onWindow,
}: {
  onPlay: () => void;
  onStock: () => void;
  onFarm: () => void;
  onWindow: (game: 'farm' | 'life' | 'stock') => void;
}) {
  const [recentFarm, setRecentFarm] = useState(() => {
    try {
      return localStorage.getItem('fish-island:recent-farm') === 'true';
    } catch {
      return false;
    }
  });
  const playFarm = () => {
    setRecentFarm(true);
    try {
      localStorage.setItem('fish-island:recent-farm', 'true');
    } catch {
      /* 存储受限不阻断进入 */
    }
    onFarm();
  };
  const [recent, setRecent] = useState(() => {
    try {
      return localStorage.getItem('fish-island:recent-life') === 'true';
    } catch {
      return false;
    }
  });
  const [recentStock, setRecentStock] = useState(() => {
    try {
      return localStorage.getItem('fish-island:recent-stock') === 'true';
    } catch {
      return false;
    }
  });
  const playStock = () => {
    setRecentStock(true);
    try {
      localStorage.setItem('fish-island:recent-stock', 'true');
    } catch {
      /* 最近游戏记录不可用时仍可进入 */
    }
    onStock();
  };
  const play = () => {
    setRecent(true);
    try {
      localStorage.setItem('fish-island:recent-life', 'true');
    } catch {
      /* 存储受限时仍可开始。 */
    }
    onPlay();
  };
  const openWindow = (game: 'farm' | 'life' | 'stock') => {
    if (game === 'farm') setRecentFarm(true);
    else if (game === 'stock') setRecentStock(true);
    else setRecent(true);
    try {
      localStorage.setItem(`fish-island:recent-${game}`, 'true');
    } catch {
      /* 最近游戏记录不可用时仍可打开窗口。 */
    }
    onWindow(game);
  };
  return (
    <div className={styles.catalog}>
      <section className={styles.recent} aria-labelledby="recent-games-title">
        <div className={styles.heading}>
          <h2 id="recent-games-title">最近玩过</h2>
          <span>
            {recent || recentStock || recentFarm
              ? `共${Number(recent) + Number(recentStock) + Number(recentFarm)}款`
              : '等你来玩'}
          </span>
        </div>
        {recent || recentStock || recentFarm ? (
          <div className={styles.recentGames}>
            {recentFarm && (
              <button type="button" className={styles.recentGame} onClick={playFarm}>
                <span className={styles.icon}>
                  <Sprout size={28} aria-hidden="true" />
                </span>
                <span>摸鱼农场</span>
                <small>再玩一次</small>
              </button>
            )}
            {recent && (
              <button type="button" className={styles.recentGame} onClick={play}>
                <span className={styles.icon}>
                  <RotateCcw size={28} aria-hidden="true" />
                </span>
                <span>人生重开模拟器</span>
                <small>再玩一次</small>
              </button>
            )}
            {recentStock && (
              <button type="button" className={styles.recentGame} onClick={playStock}>
                <span className={styles.icon}>
                  <ChartCandlestick size={28} aria-hidden="true" />
                </span>
                <span>摸鱼股市</span>
                <small>再玩一次</small>
              </button>
            )}
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
        <p className={styles.note}>无需下载，即点即玩 · 农场与股市需登录，进度保存在账号中</p>
      </section>
    </div>
  );
}
