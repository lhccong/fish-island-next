import { DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { GameCatalog } from '@/features/games';
import styles from './GamesPage.module.css';

// 旧项目 README 的稳定版域名与 config/routes.ts 中的游戏路由。
const lifeGameUrl = 'https://yucoder.cn/game/life';

export function GamesPage() {
  return (
    <WorkspaceLayout
      sidebarLabel="发现导航"
      slots={{
        sidebar: <DiscoveryNavigation />,
        header: (
          <>
            <div className={styles.header}>
              <h1>游戏</h1>
              <span>找点乐趣，轻松摸鱼</span>
            </div>
            <DiscoveryNavigation mobile />
          </>
        ),
        content: <GameCatalog lifeGameUrl={lifeGameUrl} />,
      }}
    />
  );
}
