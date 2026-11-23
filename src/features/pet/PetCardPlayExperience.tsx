import { useEffect, useRef, useState } from 'react';
import { GalleryVerticalEnd, History, PackageOpen } from 'lucide-react';
import {
  getPetCard,
  petCardRequiredLevel,
  type PetCardCatalog,
  type PetCardId,
  type PetCardPlayAction,
  type PetCardPlayPort,
  type PetCardPlayState,
} from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { usePetOperation } from './resource';
import { PetCardBulkUpgrade } from './PetCardBulkUpgrade';
import { PetCardFeedback } from './cards/PetCardFeedback';
import { PetCardHistory } from './cards/PetCardHistory';
import { PetCardShowcase } from './cards/PetCardShowcase';
import { PetPackRevealActions } from './cards/PetPackActions';
import { PetPackCarousel } from './cards/PetPackCarousel';
import { PetPackPurchase } from './PetPackPurchase';
import { PetPackStage } from './cards/PetPackStage';
import { ShinyCardReveal } from './cards/ShinyCardReveal';
import { usePetCardActions } from './cards/use-pet-card-actions';
import type { MovePack } from './cards/use-pack-swipe';
import styles from './cards/PetCards.module.css';

const views = [
  { id: 'pack', label: '开卡包', Icon: PackageOpen },
  { id: 'collection', label: '我的收藏', Icon: GalleryVerticalEnd },
  { id: 'history', label: '开包记录', Icon: History },
] as const;
type View = (typeof views)[number]['id'];

export function PetCardPlayExperience({
  port,
  catalog,
  state,
  accept,
  onPurchased,
}: {
  port: PetCardPlayPort;
  catalog: PetCardCatalog;
  state: PetCardPlayState;
  accept: (state: PetCardPlayState) => void;
  onPurchased: ((signal: AbortSignal) => Promise<unknown>) | undefined;
}) {
  const [view, setView] = useState<View>('pack');
  const [selected, setSelected] = useState(catalog.packIds[0]!);
  const [reveals, setReveals] = useState<{ id: string; positions: number[] }>();
  const [spotlight, setSpotlight] = useState<PetCardId[]>([]);
  const [opening, setOpening] = useState(false);
  const { pending, notice, clearNotice, run: perform } = usePetOperation();
  const submit = usePetCardActions(port, state, accept, onPurchased);
  const viewport = useRef<HTMLDivElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!opening || pending) return;
    const timer = window.setTimeout(
      () => setOpening(false),
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 520,
    );
    return () => window.clearTimeout(timer);
  }, [opening, pending]);
  const result = state.pending;
  const pack = catalog.packs[result?.poolId ?? selected] ?? catalog.packs[catalog.packIds[0]!]!;
  const stock = state.stock.find((entry) => entry.poolId === pack.id);
  const levelRequired = petCardRequiredLevel(pack.id);
  const lockedAt = state.level < levelRequired ? levelRequired : null;
  const free = pack.id === 'island' ? state.freeRemaining : null;
  const revealed = result && reveals?.id === result.id ? reveals.positions : [];
  const playingShiny = spotlight.length > 0;
  const hidden =
    result?.cards.flatMap((_, index) => (revealed.includes(index) ? [] : [index])) ?? [];
  const multiple = catalog.packIds.length > 1;
  const activeView = result || opening ? 'pack' : view;
  const batchView = state.batch?.type === 'upgrade' ? 'collection' : 'pack';
  const batch = activeView === batchView ? state.batch : null;
  const collection = new Map(
    state.collection
      .filter((card) => catalog.cards[card.cardId])
      .map((card) => [card.cardId, card]),
  );
  const collected = [...collection.keys()];
  const showcased = collected.filter((id) => collection.get(id)?.showcased);
  const move: MovePack | undefined =
    multiple && !result && !opening && !pending && !playingShiny
      ? (direction) => {
          const ids = catalog.packIds;
          setSelected(ids[(ids.indexOf(pack.id) + direction + ids.length) % ids.length]!);
          clearNotice();
          if (viewport.current) viewport.current.scrollTop = 0;
        }
      : undefined;

  function run(action: PetCardPlayAction, message: string) {
    void perform((signal) => submit(action, signal), message);
  }

  function switchView(next: View) {
    if (view === next) return;
    setView(next);
    clearNotice();
    if (viewport.current) viewport.current.scrollTop = 0;
  }

  function open() {
    setOpening(true);
    run({ type: 'open', poolId: pack.id }, '');
  }

  function flip(positions: number[], fromCard = false) {
    if (!result || playingShiny || opening || pending) return;
    const scroll = viewport.current;
    const target = fromCard
      ? undefined
      : scroll?.querySelector(`[data-pack-position="${(positions.at(-1) ?? 0) + 1}"]`);
    if (scroll && target) {
      const { top, bottom } = scroll.getBoundingClientRect();
      const card = target.getBoundingClientRect();
      if (card.bottom > bottom - 4) scroll.scrollTop += card.bottom - bottom + 4;
      else if (card.top < top + 4) scroll.scrollTop += card.top - top - 4;
    }
    setReveals({ id: result.id, positions: [...revealed, ...positions] });
    const shiny = positions.flatMap((position) => {
      const id = result.cards[position]?.cardId;
      return id && getPetCard(id, catalog).grade === 'shiny' ? [id] : [];
    });
    if (shiny.length) setSpotlight([...new Set(shiny)]);
  }

  function advance() {
    if (playingShiny) setSpotlight([]);
    else if (hidden.length) flip([hidden[0]!]);
    else if (result) run({ type: 'finish', openingId: result.id }, '开包完成');
  }

  const pull = revealed.length ? result?.cards[revealed.at(-1)!] : undefined;
  if (result?.cards.some((card) => !catalog.cards[card.cardId])) {
    return (
      <p role="alert" className={styles.unavailable}>
        卡池配置已更新，请关闭后重新打开。
      </p>
    );
  }
  return (
    <div className={styles.demo}>
      <header className={styles.toolbar}>
        <div role="group" aria-label="卡包功能" className={styles.tabs}>
          {views.map(({ id, label, Icon }) => (
            <Button
              key={id}
              variant="secondary"
              aria-pressed={activeView === id}
              disabled={id !== 'pack' && (!!result || opening || playingShiny || pending)}
              onClick={() => switchView(id)}
            >
              <Icon size={16} aria-hidden="true" /> {label}
            </Button>
          ))}
        </div>
        {activeView === 'pack' && (
          <PetPackCarousel
            name={pack.name}
            stock={stock?.quantity ?? 0}
            move={move}
            multiple={multiple}
          />
        )}
        <div className={styles.counters}>
          <span>
            抽卡等级 <strong>Lv.{state.level}</strong>
          </span>
          <span>{state.xpToNext > 0 ? `距升级 ${state.xpToNext} 包` : '已满级'}</span>
          <span>
            可用积分 <strong>{state.balance.toLocaleString('zh-CN')}</strong>
          </span>
        </div>
      </header>
      <div className={styles.stageFrame}>
        <ScrollArea
          label="宠物卡包内容"
          gutter="reserved"
          className={styles.scroll ?? ''}
          viewportRef={viewport}
        >
          {activeView === 'history' ? (
            <PetCardHistory port={port} />
          ) : (
            <div className={styles.body}>
              {activeView === 'pack' && (
                <PetPackStage
                  pack={pack}
                  result={
                    result && !opening
                      ? {
                          cards: result.cards.map(({ cardId, duplicate }) => ({
                            id: cardId,
                            duplicate,
                            points: 0,
                          })),
                        }
                      : null
                  }
                  revealed={revealed}
                  opening={opening}
                  firstPack={pack.id === 'island' && !stock?.opened}
                  move={move}
                  revealDisabled={pending || playingShiny}
                  onReveal={(position, keyboard) => {
                    flip([position], true);
                    if (keyboard) primary.current?.focus({ preventScroll: true });
                  }}
                />
              )}
              {activeView === 'collection' && (
                <PetCardShowcase
                  cardIds={collected}
                  owned={collected}
                  showcased={showcased}
                  pending={pending}
                  bulkUpgrade={
                    <PetCardBulkUpgrade
                      collection={state.collection}
                      pending={pending}
                      submit={submit}
                    />
                  }
                  onReplay={(id) => setSpotlight([id])}
                  onDisplay={(cardId, displayed) =>
                    run(
                      { type: displayed ? 'remove' : 'display', cardId },
                      displayed ? '已撤下卡片' : '已上架卡片',
                    )
                  }
                  upgrades={{
                    collection,
                    onUpgrade: (card) =>
                      run(
                        { type: 'upgrade', cardId: card.cardId, stars: card.stars },
                        `已升至 ${card.stars + 1} 星`,
                      ),
                  }}
                />
              )}
            </div>
          )}
        </ScrollArea>
        {playingShiny && <ShinyCardReveal cards={spotlight} />}
      </div>
      {(activeView === 'pack' || playingShiny || batch || notice?.message || pending) && (
        <footer className={styles.footer}>
          <PetCardFeedback
            notice={notice}
            pending={activeView === 'collection' && pending}
            daily={activeView === 'pack' && !result && !opening && free !== null}
            batch={batch}
            onHistory={() => switchView('history')}
          />
          <div className={styles.actions}>
            {result || opening || playingShiny ? (
              <PetPackRevealActions
                pending={pending}
                actionRef={primary}
                reveal={{
                  label: opening
                    ? '正在拆封…'
                    : playingShiny
                      ? '继续'
                      : hidden.length
                        ? '翻开下一张'
                        : '完成开包',
                  opening,
                  advance,
                  flipAll:
                    hidden.length && !opening && !playingShiny
                      ? () => {
                          flip(hidden);
                          primary.current?.focus({ preventScroll: true });
                        }
                      : undefined,
                }}
              />
            ) : (
              activeView === 'pack' && (
                <PetPackPurchase
                  pack={pack}
                  lockedAt={lockedAt}
                  free={free}
                  stock={stock?.quantity ?? 0}
                  balance={state.balance}
                  pending={pending}
                  onClaim={() => run({ type: 'claim', poolId: pack.id }, '免费卡包已存入库存')}
                  onOpen={open}
                  submit={submit}
                />
              )
            )}
          </div>
        </footer>
      )}
      <span className={styles.screenReader} role="status">
        {pull ? `${pull.name}，${pull.duplicate ? '重复卡，已存为升星材料' : '新收藏'}` : ''}
      </span>
    </div>
  );
}
