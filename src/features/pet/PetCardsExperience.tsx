import { useEffect, useRef, useState } from 'react';
import { Disc3, GalleryVerticalEnd, PackageOpen } from 'lucide-react';
import {
  dailyPetPackLimit,
  getPetCard,
  petCardGrades,
  remainingPetPacks,
  unopenedPetPacks,
  type PetCardCatalog,
  type PetCardId,
  type PetCardPackKind,
  type PetCardsPort,
} from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { ConfirmAction } from './ConfirmAction';
import { PetCardShowcase } from './cards/PetCardShowcase';
import { PetPackActions } from './cards/PetPackActions';
import { PetPackCarousel } from './cards/PetPackCarousel';
import { PetPackStage } from './cards/PetPackStage';
import { ShinyCardReveal } from './cards/ShinyCardReveal';
import { usePetCards } from './cards/use-pet-cards';
import type { MovePack } from './cards/use-pack-swipe';
import styles from './cards/PetCards.module.css';

export function PetCardsExperience({
  port,
  userId,
  catalog,
}: {
  port: PetCardsPort;
  userId: string;
  catalog: PetCardCatalog;
}) {
  const { snapshot, day, pending, error, clearError, retry, run } = usePetCards(
    port,
    userId,
    catalog,
  );
  const [view, setView] = useState<'pack' | 'showcase'>('pack');
  const [selection, setSelection] = useState<PetCardPackKind | null>(null);
  const [reveal, setReveal] = useState<{ id: number; positions: number[] }>({
    id: 0,
    positions: [],
  });
  const [opening, setOpening] = useState(false);
  const [spotlight, setSpotlight] = useState<PetCardId[]>([]);
  const [resetNotice, setResetNotice] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const revealAction = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!opening || pending) return;
    const timer = window.setTimeout(
      () => setOpening(false),
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 520,
    );
    return () => window.clearTimeout(timer);
  }, [opening, pending]);

  if (snapshot.status === 'loading') {
    return (
      <div className={styles.loading}>
        <LoadingIndicator>正在读取宠物卡包…</LoadingIndicator>
      </div>
    );
  }
  if (snapshot.status === 'error') {
    return (
      <div className={styles.unavailable}>
        <p role="alert">无法读取试玩进度，请检查浏览器存储后重试。</p>
        <Button variant="secondary" onClick={retry}>
          重试
        </Button>
      </div>
    );
  }

  const { progress } = snapshot;
  const { result, opened, owned, showcased, points } = progress;
  const selected = result?.pack ?? selection ?? progress.pack;
  const pack =
    (selected ? catalog.packs[selected] : undefined) ??
    (result ? undefined : catalog.packs[catalog.packIds[0]!]);
  if (!pack || result?.cards.some(({ id }) => !catalog.cards[id]))
    return (
      <p className={styles.unavailable} role="alert">
        当前卡包的配置不完整，请联系管理员。
      </p>
    );
  const { id: kind, ids: cardIds } = pack;
  const packOwned = owned.filter((id) => cardIds.includes(id));
  const remaining = remainingPetPacks(progress, day);
  const stock = unopenedPetPacks(progress, kind);
  const hasStock = Object.values(progress.unopened).some((count) => count > 0);
  const revealed = result?.id === reveal.id ? reveal.positions : [];
  const hidden =
    result?.cards.flatMap((pull, index) => (revealed.includes(index) ? [] : [{ pull, index }])) ??
    [];
  const flipping = hidden.length > 0;
  const playingShiny = spotlight.length > 0;
  const lastPosition = revealed.at(-1);
  const lastPull = lastPosition === undefined ? undefined : result?.cards[lastPosition];
  const shownPoints = points - hidden.reduce((sum, { pull }) => sum + pull.points, 0);
  const shownOwned =
    packOwned.length -
    hidden.filter(({ pull }) => !pull.points && cardIds.includes(pull.id)).length;
  const initial = remaining === dailyPetPackLimit && !hasStock && !result && owned.length === 0;
  const multiple = catalog.packIds.length > 1;
  const movePack: MovePack | undefined =
    multiple && !result && !pending && !opening && !playingShiny
      ? (direction, preserveScroll) => {
          const { packIds } = catalog;
          const index = packIds.indexOf(kind);
          setSelection(packIds[(index + direction + packIds.length) % packIds.length]!);
          clearError();
          if (!preserveScroll && viewport.current) viewport.current.scrollTop = 0;
        }
      : undefined;

  function switchView(next: 'pack' | 'showcase') {
    if (next !== view) setSpotlight([]);
    if (next !== view && viewport.current) viewport.current.scrollTop = 0;
    setView(next);
  }

  async function openPack() {
    setOpening(true);
    if (!(await run({ type: 'open', packId: opened + 1, pack: kind }))) setOpening(false);
  }

  function flipCards(positions: number[], fromCard = false) {
    if (!result || playingShiny || opening || pending) return;
    const scroll = viewport.current;
    const last = positions.at(-1);
    if (last === undefined) return;
    const target = fromCard
      ? undefined
      : scroll?.querySelector(`[data-pack-position="${last + 1}"]`);
    if (scroll && target) {
      const { top, bottom } = scroll.getBoundingClientRect();
      const card = target.getBoundingClientRect();
      if (card.bottom > bottom - 4) scroll.scrollTop += card.bottom - bottom + 4;
      else if (card.top < top + 4) scroll.scrollTop += card.top - top - 4;
    }
    setReveal({ id: result.id, positions: [...revealed, ...positions] });
    const shiny = hidden.flatMap(({ index, pull }) =>
      positions.includes(index) && getPetCard(pull.id, catalog).grade === 'shiny' ? [pull.id] : [],
    );
    if (shiny.length) setSpotlight([...new Set(shiny)]);
  }

  let primaryLabel = flipping ? '翻开下一张' : '完成开包';
  if (opening) primaryLabel = '正在拆封…';
  if (playingShiny) primaryLabel = '继续';

  function advance() {
    if (playingShiny) {
      setSpotlight([]);
    } else if (result) {
      if (flipping) flipCards([hidden[0]!.index]);
      else void run({ type: 'finish', packId: result.id });
    }
  }

  function flipAll() {
    flipCards(hidden.map(({ index }) => index));
    revealAction.current?.focus({ preventScroll: true });
  }

  return (
    <div className={styles.demo}>
      <header className={styles.toolbar}>
        <div role="group" aria-label="卡包玩法" className={styles.tabs}>
          <Button
            variant="secondary"
            aria-pressed={view === 'pack'}
            onClick={() => switchView('pack')}
          >
            <PackageOpen size={16} aria-hidden="true" /> 开卡包
          </Button>
          <Button
            variant="secondary"
            aria-pressed={view === 'showcase'}
            disabled={flipping || opening || playingShiny}
            onClick={() => switchView('showcase')}
          >
            <GalleryVerticalEnd size={16} aria-hidden="true" /> 展示柜
          </Button>
          <PetPackCarousel name={pack.name} stock={stock} move={movePack} multiple={multiple} />
        </div>
        <div className={styles.counters}>
          <span>
            今日可领{' '}
            <strong>
              {remaining} / {dailyPetPackLimit}
            </strong>
          </span>
          <span>
            收藏{' '}
            <strong>
              {shownOwned} / {cardIds.length}
            </strong>
          </span>
          <span>
            <Disc3 size={14} aria-hidden="true" /> 试玩积分 <strong>{shownPoints}</strong>
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
          <div className={styles.body}>
            {view === 'pack' ? (
              <PetPackStage
                pack={pack}
                result={opening ? null : result}
                revealed={revealed}
                opening={opening && !pending}
                firstPack={shownOwned === 0}
                move={movePack}
                revealDisabled={pending || playingShiny}
                onReveal={(position, keyboard) => {
                  flipCards([position], true);
                  if (keyboard) revealAction.current?.focus({ preventScroll: true });
                }}
              />
            ) : (
              <PetCardShowcase
                cardIds={cardIds}
                owned={packOwned}
                showcased={showcased}
                pending={pending}
                onReplay={(id) => setSpotlight([id])}
                onDisplay={(id, displayed) =>
                  void run({ type: displayed ? 'remove' : 'display', id })
                }
                onRemoveAll={() => void run({ type: 'removeAll' })}
              />
            )}
          </div>
        </ScrollArea>
        {playingShiny && <ShinyCardReveal cards={spotlight} />}
      </div>
      <footer className={styles.footer}>
        <div className={styles.feedback}>
          {error && <p role="alert">{error}</p>}
          {view === 'showcase' && pending && <LoadingIndicator compact>正在保存…</LoadingIndicator>}
          {resetNotice && initial ? (
            <p role="status">已恢复试玩初始状态。</p>
          ) : (
            <p>
              {view === 'showcase'
                ? '收藏的卡可上架展示。'
                : remaining || hasStock || result
                  ? '待拆卡包可跨日保留。'
                  : '北京时间 00:00 恢复领取次数。'}
            </p>
          )}
        </div>
        <div className={styles.actions}>
          <ConfirmAction
            label="恢复初始状态"
            description="将清空本机待拆卡包、开包进度、收藏、展示柜和试玩积分，并恢复今天的两次领取机会。"
            disabled={pending || opening || playingShiny}
            action={async () => {
              await port.update(userId, { type: 'reset' }, catalog);
            }}
            onSuccess={() => {
              clearError();
              setResetNotice(true);
              setSelection(null);
              switchView('pack');
              if (viewport.current) viewport.current.scrollTop = 0;
            }}
          />
          {(view === 'pack' || playingShiny) && (
            <PetPackActions
              canClaim={remaining > 0}
              hasStock={stock > 0}
              pending={pending}
              actionRef={revealAction}
              onClaim={() => void run({ type: 'claim', pack: kind })}
              onOpen={() => void openPack()}
              reveal={
                result || opening || playingShiny
                  ? {
                      label: primaryLabel,
                      opening,
                      advance,
                      flipAll: flipping && !opening && !playingShiny ? flipAll : undefined,
                    }
                  : undefined
              }
            />
          )}
        </div>
      </footer>
      <span className={styles.screenReader} role="status">
        {lastPull
          ? `${petCardGrades[getPetCard(lastPull.id, catalog).grade].name}，${getPetCard(lastPull.id, catalog).name}${lastPull.points ? `，重复，分解 ${lastPull.points} 积分` : '，新收藏'}`
          : ''}
      </span>
    </div>
  );
}
