import { DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
import { AboutNavigation } from '@/app/components/AboutNavigation';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import {
  AboutWorkspace,
  RewardWorkspace,
  WelfareWorkspace,
  ProductsWorkspace,
} from '@/features/about';
import { aboutService } from '@/app/config/about';
import styles from './GamesPage.module.css';

export function AboutPage({
  section = 'reward',
}: {
  section?: 'about' | 'reward' | 'welfare' | 'other';
}) {
  const title = { about: '共建与反馈', reward: '赞助榜', welfare: '外卖福利', other: '其他产品' }[
    section
  ];
  return (
    <WorkspaceLayout
      sidebarLabel="发现导航"
      mobileHeader="back-only"
      slots={{
        contentScroll: false,
        sidebar: <DiscoveryNavigation />,
        header: (
          <>
            <div className={styles.header}>
              <h1>{title}</h1>
              <span>一起共建摸鱼岛</span>
            </div>
            <AboutNavigation />
          </>
        ),
        content: (
          <div className={styles.aboutContent}>
            <div className={styles.mobileAboutNavigation}>
              <AboutNavigation />
            </div>
            {section === 'reward' ? (
              <RewardWorkspace service={aboutService} />
            ) : section === 'welfare' ? (
              <WelfareWorkspace />
            ) : section === 'other' ? (
              <ProductsWorkspace />
            ) : (
              <AboutWorkspace />
            )}
          </div>
        ),
      }}
    />
  );
}
