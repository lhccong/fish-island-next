import { DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { ReaderWorkspace } from '@/features/reader';
import { readerService } from '@/infrastructure/reader';
import { readerController } from '@/app/config/reader';
import styles from './GamesPage.module.css';
export function ReaderPage({ onOpen }: { onOpen: () => void }) {
  return (
    <WorkspaceLayout
      sidebarLabel="发现导航"
      mobileHeader="back-only"
      slots={{
        sidebar: <DiscoveryNavigation />,
        header: (
          <>
            <div className={styles.header}>
              <h1>摸鱼阅读</h1>
              <span>阅读片刻，自在摸鱼</span>
            </div>
          </>
        ),
        content: (
          <ReaderWorkspace controller={readerController} service={readerService} onOpen={onOpen} />
        ),
      }}
    />
  );
}
