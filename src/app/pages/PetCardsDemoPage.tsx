import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { PetCardsDemo } from '@/features/pet';
import { createBrowserPetCards } from '@/infrastructure/pet';
import styles from './PetCardsDemoPage.module.css';

const previewCollection = createBrowserPetCards('guest-preview');

export function PetCardsDemoPage() {
  return (
    <WorkspaceLayout
      hideSidebar
      mobileHeader="back-only"
      slots={{
        header: null,
        sidebar: null,
        contentScroll: false,
        content: (
          <section className={styles.preview} aria-labelledby="pet-cards-demo-title">
            <div className={styles.panel}>
              <h1 id="pet-cards-demo-title">宠物卡包试玩</h1>
              <PetCardsDemo port={previewCollection} userId="guest" />
            </div>
          </section>
        ),
      }}
    />
  );
}
