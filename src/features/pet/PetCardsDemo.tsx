import { useEffect, useState } from 'react';
import type { PetCardCatalog, PetCardsPort } from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { PetCardCatalogContext } from './cards/catalog-context';
import { PetCardsExperience } from './PetCardsExperience';
import styles from './cards/PetCards.module.css';

type CatalogState = { status: 'loading' | 'error' } | { status: 'ready'; catalog: PetCardCatalog };

export function PetCardsDemo({ port, userId }: { port: PetCardsPort; userId: string }) {
  const [state, setState] = useState<CatalogState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void port.catalog(controller.signal).then(
      (catalog) => {
        if (!controller.signal.aborted) setState({ status: 'ready', catalog });
      },
      () => {
        if (!controller.signal.aborted) setState({ status: 'error' });
      },
    );
    return () => controller.abort();
  }, [port, attempt]);
  if (state.status === 'loading')
    return (
      <div className={styles.loading}>
        <LoadingIndicator>正在读取卡池…</LoadingIndicator>
      </div>
    );
  if (state.status !== 'ready')
    return (
      <div className={styles.unavailable}>
        <p role="alert">暂时无法读取卡池。</p>
        <Button
          variant="secondary"
          onClick={() => {
            setState({ status: 'loading' });
            setAttempt((value) => value + 1);
          }}
        >
          重试
        </Button>
      </div>
    );
  if (!state.catalog.packIds.length)
    return <p className={styles.unavailable}>暂无可抽取的卡包。</p>;
  return (
    <PetCardCatalogContext.Provider value={state.catalog}>
      <PetCardsExperience port={port} userId={userId} catalog={state.catalog} />
    </PetCardCatalogContext.Provider>
  );
}
