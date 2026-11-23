import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdminPetCardPort } from '@/domain/admin';
import {
  petCardGrades,
  type PetCardAtlasDefinition,
  type PetCardDefinition,
  type PetCardPoolDefinition,
} from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { CardAtlasImage } from '@/shared/ui/CardAtlasImage';
import { InfiniteScroll, useInfinitePages } from '@/shared/ui/InfiniteScroll';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { Choice, Field } from './fields';
import { PetCardAtlasEditor } from './PetCardAtlasEditor';
import { PetCardEditor } from './PetCardEditor';
import { PetCardPoolEditor } from './PetCardPoolEditor';
import admin from './Admin.module.css';
import styles from './PetCardPoolSettings.module.css';

type Editing =
  | { kind: 'pool'; pool: PetCardPoolDefinition | null }
  | { kind: 'card'; card: PetCardDefinition | null }
  | { kind: 'atlas' };
type Metadata = { pools: PetCardPoolDefinition[]; atlases: PetCardAtlasDefinition[] };

export function PetCardPoolSettings({ port }: { port: AdminPetCardPort }) {
  const [metadata, setMetadata] = useState<Metadata>();
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [poolId, setPoolId] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Editing | null>(null);
  const [notice, setNotice] = useState('');
  const origin = useRef<HTMLElement | null>(null);
  const load = useCallback(
    (page: number, signal: AbortSignal) => port.cards(page, poolId, query, signal),
    [port, poolId, query],
  );
  const pages = useInfinitePages(load);
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    void Promise.all([port.pools(signal), port.atlases(signal)])
      .then(([pools, atlases]) => {
        if (!signal.aborted) {
          setMetadata({ pools, atlases });
          setError('');
        }
      })
      .catch((cause: unknown) => {
        if (!signal.aborted) setError(cause instanceof Error ? cause.message : '加载卡池配置失败');
      });
    return () => controller.abort();
  }, [port, revision]);

  function refresh() {
    setError('');
    setRevision((old) => old + 1);
    pages.refresh();
  }
  function edit(next: Editing, target: HTMLElement) {
    origin.current = target;
    setNotice('');
    setEditing(next);
  }
  const modal = {
    port,
    returnFocusRef: origin,
    onClose: () => setEditing(null),
    onSaved: () => {
      setNotice(editing?.kind === 'atlas' ? '图集已上传，可在卡牌中选择格位。' : '配置已保存。');
      setEditing(null);
      refresh();
    },
  };
  if (!metadata)
    return (
      <div className={admin.workspace}>
        {error ? (
          <div className={admin.empty}>
            <p role="alert">{error}</p>
            <Button onClick={refresh}>重试</Button>
          </div>
        ) : (
          <LoadingIndicator>正在加载卡池配置…</LoadingIndicator>
        )}
      </div>
    );
  const { pools, atlases } = metadata;
  const atlasUrls = new Map(atlases.map(({ id, url }) => [id, url]));
  const currentPool = pools.find(({ id }) => id === poolId);
  return (
    <div className={admin.workspace}>
      <section className={admin.tablePanel} aria-label="卡池与图集">
        <div className={styles.toolbar}>
          <Choice
            label="筛选卡池"
            value={poolId || '*'}
            options={[
              { value: '*', label: '全部卡池' },
              ...pools.map(({ id, name }) => ({ value: id, label: name })),
            ]}
            onChange={(value) => setPoolId(value === '*' ? '' : value)}
          />
          <div className={styles.actions}>
            {currentPool && (
              <Button
                variant="secondary"
                onClick={(e) => edit({ kind: 'pool', pool: currentPool }, e.currentTarget)}
              >
                配置此池
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={(e) => edit({ kind: 'pool', pool: null }, e.currentTarget)}
            >
              新增卡池
            </Button>
            <Button variant="secondary" onClick={(e) => edit({ kind: 'atlas' }, e.currentTarget)}>
              上传十卡图集
            </Button>
          </div>
        </div>
        {!pools.length && <p className={styles.help}>暂无卡池，可以先新增卡池。</p>}
        {!atlases.length && <p className={styles.help}>请先上传十卡图集，再新增卡牌。</p>}
        {error && (
          <div className={styles.fileRow}>
            <p role="alert">{error}</p>
            <Button variant="secondary" onClick={refresh}>
              重试配置
            </Button>
          </div>
        )}
        {notice && (
          <p role="status" className={styles.notice}>
            {notice}
          </p>
        )}
      </section>
      <section className={admin.tablePanel} aria-label="卡牌列表">
        <form
          className={styles.toolbar}
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search.trim());
          }}
        >
          <Field
            label="名称或卡牌编号"
            value={search}
            maxLength={80}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className={styles.actions}>
            <Button type="submit" variant="secondary">
              搜索
            </Button>
            <Button variant="secondary" onClick={refresh}>
              刷新
            </Button>
            <Button
              disabled={!atlases.length}
              onClick={(e) => edit({ kind: 'card', card: null }, e.currentTarget)}
            >
              新增卡牌
            </Button>
          </div>
        </form>
        {pages.result.status === 'loading' ? (
          <div className={admin.empty}>
            <LoadingIndicator>正在加载卡牌…</LoadingIndicator>
          </div>
        ) : pages.result.status === 'error' ? (
          <div className={admin.empty}>
            <p role="alert">{pages.result.message}</p>
            <Button onClick={pages.refresh}>重试卡牌</Button>
          </div>
        ) : !pages.result.data.items.length ? (
          <p className={admin.empty}>暂无符合条件的卡牌。</p>
        ) : (
          <>
            <ul className={styles.cardList}>
              {pages.result.data.items.map((card) => (
                <li className={styles.cardRow} key={card.id}>
                  <div className={styles.cardIdentity}>
                    <CardAtlasImage
                      className={styles.thumbnail ?? ''}
                      src={atlasUrls.get(card.artKey)}
                      alt={`${card.name}插画`}
                      tile={card.artTile}
                      portrait={card.artPortrait}
                    />
                    <div className={styles.cardName}>
                      <strong>{card.name}</strong>
                      <span>{card.id}</span>
                    </div>
                  </div>
                  <span className={styles.grade} data-card-grade={card.grade}>
                    {petCardGrades[card.grade].name}
                  </span>
                  <span className={styles.membership}>
                    {pools
                      .filter(({ id }) => card.poolIds.includes(id))
                      .map(({ name }) => name)
                      .join('、') || '未入池'}
                  </span>
                  <Button
                    variant="secondary"
                    aria-label={`编辑${card.name}`}
                    onClick={(e) => edit({ kind: 'card', card }, e.currentTarget)}
                  >
                    编辑
                  </Button>
                </li>
              ))}
            </ul>
            <InfiniteScroll
              hasMore={pages.hasMore}
              loading={pages.loadingMore}
              error={pages.error}
              onLoadMore={pages.loadMore}
              label="卡牌"
            />
          </>
        )}
      </section>
      {editing?.kind === 'pool' && <PetCardPoolEditor {...modal} pool={editing.pool} />}
      {editing?.kind === 'atlas' && <PetCardAtlasEditor {...modal} />}
      {editing?.kind === 'card' && (
        <PetCardEditor
          {...modal}
          card={editing.card}
          pool={poolId}
          pools={pools}
          atlases={atlases}
        />
      )}
    </div>
  );
}
