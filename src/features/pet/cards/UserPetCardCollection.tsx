import { useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, Sparkles, Star } from 'lucide-react';
import { petCardGrades, type PetCardCollectionPort } from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { CardAtlasImage } from '@/shared/ui/CardAtlasImage';
import { InfiniteScroll, useInfinitePages } from '@/shared/ui/InfiniteScroll';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import styles from './UserPetCardCollection.module.css';

export function UserPetCardCollection({
  port,
  userId,
  name,
  onBack,
}: {
  port: PetCardCollectionPort;
  userId: string;
  name: string;
  onBack: () => void;
}) {
  const back = useRef<HTMLButtonElement>(null);
  const load = useCallback(
    (page: number, signal: AbortSignal) => port.collection(userId, page, signal),
    [port, userId],
  );
  const pages = useInfinitePages(load);
  const { result } = pages;
  useEffect(() => back.current?.focus(), []);

  return (
    <section className={styles.collection} aria-label="卡片收藏">
      <header className={styles.header}>
        <Button ref={back} variant="secondary" onClick={onBack} aria-label="返回用户卡片">
          <ArrowLeft size={16} aria-hidden="true" />
          返回
        </Button>
        <h3>{name}的卡片收藏</h3>
      </header>
      {result.status === 'loading' && <LoadingIndicator>正在读取卡片收藏…</LoadingIndicator>}
      {result.status === 'error' && (
        <div className={styles.feedback}>
          <p role="alert">{result.message}</p>
          <Button variant="secondary" onClick={pages.refresh}>
            重试卡片收藏
          </Button>
        </div>
      )}
      {result.status === 'ready' &&
        (result.data.items.length === 0 ? (
          <div className={styles.feedback}>
            <p role="status">还没有收藏卡片</p>
          </div>
        ) : (
          <ScrollArea
            label="卡片收藏列表"
            gutter="reserved"
            persistentScrollbar
            className={styles.scroll ?? ''}
          >
            <ul role="list" className={styles.cards}>
              {result.data.items.map(({ id, name, grade, stars, art }) => (
                <li key={id} className={styles.card} data-grade={grade}>
                  <div className={styles.cardContent}>
                    <CardAtlasImage
                      className={styles.art ?? ''}
                      src={art.url}
                      alt=""
                      tile={art.tile}
                      portrait={art.portrait}
                      showFullTile
                    />
                    <div className={styles.details}>
                      <strong className={styles.name}>{name}</strong>
                      <div className={styles.attributes}>
                        <span className={styles.grade}>
                          {grade === 'shiny' && <Sparkles size={12} aria-hidden="true" />}
                          {petCardGrades[grade].name}
                        </span>
                        <span className={styles.stars}>
                          <Star size={14} aria-hidden="true" />
                          {stars} 星
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <InfiniteScroll
              label="卡片收藏"
              hasMore={pages.hasMore}
              loading={pages.loadingMore}
              error={pages.error}
              onLoadMore={pages.loadMore}
            />
          </ScrollArea>
        ))}
    </section>
  );
}
