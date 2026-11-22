import { useEffect, useRef, useState } from 'react';
import { Disc3, GalleryVerticalEnd, PackageOpen } from 'lucide-react';
import {
  dailyPetPackLimit,
  petCardGrades,
  petCardPacks,
  petCards,
  petPackSize,
  remainingPetPacks,
  type PetCardId,
  type PetCardPackKind,
  type PetCardsPort,
} from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Select } from '@/shared/ui/Select';
import { ConfirmAction } from './ConfirmAction';
import { PetCardShowcase } from './cards/PetCardShowcase';
import { PetPackStage } from './cards/PetPackStage';
import { ShinyCardReveal } from './cards/ShinyCardReveal';
import { usePetCards } from './cards/use-pet-cards';
import styles from './cards/PetCards.module.css';

const packOptions = Object.entries(petCardPacks).map(([value, pack]) => ({
  value,
  label: pack.name,
}));

export function PetCardsDemo({ port, userId }: { port: PetCardsPort; userId: string }) {
  const { snapshot, day, pending, error, clearError, retry, run } = usePetCards(port, userId);
  const [view, setView] = useState<'pack' | 'showcase'>('pack');
  const [selection, setSelection] = useState<PetCardPackKind | null>(null);
  const [reveal, setReveal] = useState({ id: 0, count: 0 });
  const [opening, setOpening] = useState(false);
  const [spotlight, setSpotlight] = useState<PetCardId[]>([]);
  const [resetNotice, setResetNotice] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);

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
  const { result, sealed, opened, owned, showcased, points } = progress;
  const activePack = sealed || !!result;
  const kind = (activePack ? progress.pack : (selection ?? progress.pack)) ?? 'island';
  const { ids: cardIds } = petCardPacks[kind];
  const packOwned = owned.filter((id) => cardIds.includes(id));
  const remaining = remainingPetPacks(progress, day);
  const revealed = result?.id === reveal.id ? reveal.count : 0;
  const flipping = !!result && revealed < petPackSize;
  const playingShiny = spotlight.length > 0;
  const lastPull = result?.cards[revealed - 1];
  const shownPoints =
    points - (result?.cards.slice(revealed).reduce((sum, pull) => sum + pull.points, 0) ?? 0);
  const shownOwned =
    packOwned.length - (result?.cards.slice(revealed).filter((pull) => !pull.points).length ?? 0);
  const initial = remaining === dailyPetPackLimit && !sealed && !result && owned.length === 0;

  function switchView(next: 'pack' | 'showcase') {
    if (next !== view) setSpotlight([]);
    if (next !== view && viewport.current) viewport.current.scrollTop = 0;
    setView(next);
  }

  async function openPack() {
    setOpening(true);
    if (!(await run({ type: 'open', packId: opened + 1 }))) setOpening(false);
  }

  function flipCards(count: number) {
    if (!result) return;
    const scroll = viewport.current;
    const target = scroll?.querySelector(`[data-pack-position="${count}"]`);
    if (scroll && target) {
      const { top, bottom } = scroll.getBoundingClientRect();
      const card = target.getBoundingClientRect();
      if (card.bottom > bottom - 4) scroll.scrollTop += card.bottom - bottom + 4;
      else if (card.top < top + 4) scroll.scrollTop += card.top - top - 4;
    }
    setReveal({ id: result.id, count });
    const shiny = result.cards
      .slice(revealed, count)
      .filter((pull) => petCards[pull.id].grade === 'shiny')
      .map((pull) => pull.id);
    if (shiny.length) setSpotlight([...new Set(shiny)]);
  }

  let primaryLabel = remaining ? '领取卡包' : '今日已领完';
  if (sealed) primaryLabel = '拆开卡包';
  if (result) primaryLabel = flipping ? '翻开下一张' : '完成开包';
  if (opening) primaryLabel = '正在拆封…';
  if (playingShiny) primaryLabel = '继续';

  function advance() {
    if (playingShiny) {
      setSpotlight([]);
    } else if (result) {
      if (flipping) flipCards(revealed + 1);
      else void run({ type: 'finish', packId: result.id });
    } else if (sealed) {
      void openPack();
    } else {
      void run({ type: 'claim', pack: kind });
    }
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
          <div className={styles.packPicker}>
            <Select
              label="选择卡包"
              value={kind}
              options={packOptions}
              disabled={activePack || pending || opening || playingShiny}
              onValueChange={(next) => {
                if (next !== 'island' && next !== 'kingdoms') return;
                setSelection(next);
                clearError();
                if (viewport.current) viewport.current.scrollTop = 0;
              }}
            />
          </div>
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
                kind={kind}
                result={opening ? null : result}
                revealed={revealed}
                opening={opening && !pending}
                firstPack={shownOwned === 0}
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
              />
            )}
          </div>
        </ScrollArea>
        {playingShiny && <ShinyCardReveal cards={spotlight} />}
      </div>
      <footer className={styles.footer}>
        <div className={styles.feedback}>
          {error && <p role="alert">{error}</p>}
          {resetNotice && initial ? (
            <p role="status">已恢复试玩初始状态。</p>
          ) : (
            <p>
              {view === 'showcase'
                ? '收藏的卡可上架，展位最多 3 张。'
                : remaining || sealed || result
                  ? '两款卡包共用今日领取额度。'
                  : '北京时间 00:00 恢复领取次数。'}
            </p>
          )}
        </div>
        <div className={styles.actions}>
          <ConfirmAction
            label="恢复初始状态"
            description="将清空海岛初遇和三国群英的本机试玩进度、收藏、展示柜和试玩积分，并恢复今天的两次领取机会。"
            disabled={pending || opening || playingShiny}
            action={async () => {
              await port.update(userId, { type: 'reset' });
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
            <>
              {flipping && !opening && !playingShiny && (
                <Button variant="secondary" onClick={() => flipCards(petPackSize)}>
                  全部翻开
                </Button>
              )}
              <Button
                onClick={advance}
                disabled={pending || opening || (!playingShiny && !result && !sealed && !remaining)}
              >
                {pending || opening ? (
                  <LoadingIndicator compact>
                    {opening ? primaryLabel : '正在保存…'}
                  </LoadingIndicator>
                ) : (
                  primaryLabel
                )}
              </Button>
            </>
          )}
        </div>
      </footer>
      <span className={styles.screenReader} role="status">
        {flipping && lastPull
          ? `${petCardGrades[petCards[lastPull.id].grade].name}，${petCards[lastPull.id].name}${lastPull.points ? `，重复，分解 ${lastPull.points} 积分` : '，新收藏'}`
          : ''}
      </span>
    </div>
  );
}
