import { useCallback, type RefObject } from 'react';
import type { PetCardPlayPort, PetCardPlayState } from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { PetCardPlayExperience } from './PetCardPlayExperience';
import { PetCardCatalogContext } from './cards/catalog-context';
import { usePetResource } from './resource';
import styles from './cards/PetCards.module.css';

export function PetCardsDialog({
  port,
  onClose,
  returnFocusRef,
  onPurchased,
  onShowcaseChanged,
}: {
  port: PetCardPlayPort;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
  onPurchased: ((signal: AbortSignal) => Promise<unknown>) | undefined;
  onShowcaseChanged: () => void;
}) {
  const load = useCallback(
    async (signal: AbortSignal) => {
      const [catalog, progress] = await Promise.all([port.catalog(signal), port.state(signal)]);
      return { catalog, progress };
    },
    [port],
  );
  const { state, data, accept, reload } = usePetResource(load);
  const catalog = data?.catalog;
  const acceptProgress = useCallback(
    (progress: PetCardPlayState) => {
      if (catalog) accept({ catalog, progress });
    },
    [accept, catalog],
  );

  return (
    <Dialog
      open
      title="宠物卡包"
      description="领取、购买和开启卡包，收集宠物卡片。"
      hideDescription
      className={styles.dialog ?? ''}
      dismissLabel="关闭宠物卡包"
      returnFocusRef={returnFocusRef}
      showCloseAction={false}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {state.status === 'loading' && (
        <div className={styles.loading}>
          <LoadingIndicator>正在读取宠物卡包…</LoadingIndicator>
        </div>
      )}
      {state.status === 'error' && (
        <div className={styles.unavailable}>
          <p role="alert">{state.message}</p>
          <Button variant="secondary" onClick={reload}>
            重试
          </Button>
        </div>
      )}
      {state.status === 'ready' &&
        (!state.data.catalog.packIds.length ? (
          <p className={styles.unavailable}>暂无可抽取的卡包。</p>
        ) : (
          <PetCardCatalogContext.Provider value={state.data.catalog}>
            <PetCardPlayExperience
              port={port}
              catalog={state.data.catalog}
              state={state.data.progress}
              accept={acceptProgress}
              onPurchased={onPurchased}
              onShowcaseChanged={onShowcaseChanged}
            />
          </PetCardCatalogContext.Provider>
        ))}
    </Dialog>
  );
}
