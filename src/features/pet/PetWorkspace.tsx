import { useCallback, useRef, useState } from 'react';
import { PageFooterOutlet } from '@/shared/ui/PageFooter';
import { Button } from '@/shared/ui/Button';
import {
  PawPrint,
  Backpack,
  Palette,
  Swords,
  BookOpen,
  ShoppingBag,
  Settings2,
  Hammer,
  Gift,
  GalleryVerticalEnd,
} from 'lucide-react';
import type { PetCardsPort, PetPort } from '@/domain/pet';
import { usePetOperation, usePetResource } from './resource';
import { ResourceView, OperationNotice } from './Feedback';
import { CampAdventure } from './CampAdventure';
import { CompanionSummary } from './CompanionSummary';
import { CareActions } from './CareActions';
import { PetWelcome } from './PetWelcome';
import { PanelDialog } from './PanelDialog';
import { CarePanel } from './CarePanel';
import { ItemsPanel } from './ItemsPanel';
import { SkinsPanel } from './SkinsPanel';
import { ChallengePanel } from './ChallengePanel';
import { TournamentPanel } from './TournamentPanel';
import { AutoFeedPanel } from './AutoFeedPanel';
import { ForgePanel } from './ForgePanel';
import { SupplyPanel } from './SupplyPanel';
import { ChallengeEntrances } from './ChallengeEntrances';
import { PetCardsDialog } from './PetCardsDialog';
import styles from './PetWorkspace.module.css';

const panels = [
  { id: 'care', title: '伙伴档案', icon: PawPrint, description: '照顾伙伴，记录每一步成长。' },
  { id: 'bag', title: '行囊', icon: Backpack, description: '整理物品与装备，让伙伴准备妥当。' },
  { id: 'skins', title: '外观', icon: Palette, description: '为伙伴挑选喜欢的模样。' },
  {
    id: 'challenge',
    title: '挑战',
    icon: Swords,
    description: '查看排行，选择对手，回放真实结算的战斗。',
  },
  { id: 'catalog', title: '物品手册', icon: BookOpen, description: '查看物品说明与基础属性。' },
  {
    id: 'shop',
    title: '补给铺',
    icon: ShoppingBag,
    description: '使用积分购买物品，购买前请确认消耗。',
  },
  { id: 'auto', title: '自动喂食', icon: Settings2, description: '为伙伴设置服务端自动喂食规则。' },
  { id: 'forge', title: '锻造台', icon: Hammer, description: '升级装备、锁定和刷新词条。' },
  {
    id: 'supplies',
    title: '抽奖转盘',
    icon: Gift,
    description: '转动九宫格，抽取装备与道具。',
  },
  { id: 'cards', title: '宠物卡包', icon: GalleryVerticalEnd, description: '拆包与展示宠物卡片。' },
] as const;
type PanelId = (typeof panels)[number]['id'];
type ChallengeMode = 'rank' | 'tower' | 'boss' | 'tournament';
type Shortcut = {
  key: string;
  target: Exclude<ChallengeMode, 'rank'> | 'supplies' | 'bag' | 'cards';
};

export function PetWorkspace({
  service,
  cardCollection,
  userId,
  shortcut = null,
  points,
  onLotterySettled,
}: {
  service: PetPort;
  cardCollection: PetCardsPort | null;
  userId: string;
  shortcut?: Shortcut | null;
  points?: number | undefined;
  onLotterySettled?: ((signal: AbortSignal) => Promise<unknown>) | undefined;
}) {
  const load = useCallback((signal: AbortSignal) => service.mine(signal), [service]);
  const resource = usePetResource(load);
  const pet = resource.data ?? null;
  const [selection, setSelection] = useState<{
    key: string | undefined;
    panel: PanelId | null;
    mode: ChallengeMode;
  } | null>(null);
  const target = shortcut?.target;
  const selectedPanel = selection?.key === shortcut?.key ? selection : null;
  const shortcutMode =
    target === 'boss' || target === 'tower' || target === 'tournament' ? target : null;
  const shortcutPanel =
    target === 'supplies' || target === 'bag' || target === 'cards' ? target : 'challenge';
  const requestedPanel = selectedPanel ? selectedPanel.panel : target ? shortcutPanel : null;
  const panel = requestedPanel === 'cards' && !cardCollection ? null : requestedPanel;
  const challengeMode = selectedPanel?.mode ?? shortcutMode ?? 'rank';
  const [inventoryRevision, setInventoryRevision] = useState(0);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const navigationRef = useRef<HTMLElement | null>(null);
  const operation = usePetOperation();
  const selected = panels.find((item) => item.id === panel);
  const busy = operation.pending || resource.state.status === 'loading';
  const onChange = resource.reload;
  function openPanel(id: PanelId, mode: ChallengeMode = 'rank') {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelection({ key: shortcut?.key, panel: id, mode });
  }
  function inventoryChanged() {
    onChange();
    setInventoryRevision((value) => value + 1);
  }
  function closePanel() {
    if (selected && !returnFocusRef.current?.isConnected)
      returnFocusRef.current =
        navigationRef.current?.querySelector<HTMLButtonElement>(
          `[aria-label="${selected.title}"]`,
        ) ?? null;
    setSelection({ key: shortcut?.key, panel: null, mode: 'rank' });
  }
  return (
    <section aria-label="伙伴营地" className={styles.scroll}>
      <div className={styles.workspace}>
        <header className={styles.intro}>
          <h1>
            <PawPrint size={22} aria-hidden="true" />
            伙伴营地
          </h1>
          <nav ref={navigationRef} className={styles.tools} aria-label="伙伴功能">
            {panels
              .filter(({ id }) => id !== 'cards' || cardCollection)
              .map(({ id, title, icon: Icon }) => (
                <Button
                  key={id}
                  variant="secondary"
                  className={styles.tool}
                  aria-label={title}
                  disabled={!pet && id !== 'cards'}
                  onClick={() => openPanel(id)}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{title}</span>
                </Button>
              ))}
          </nav>
        </header>
        <div className={styles.dashboard}>
          <section className={styles.companion} aria-label="伙伴与装备">
            <ResourceView state={resource.state} reload={resource.reload}>
              {(data) =>
                data ? (
                  <CompanionSummary pet={data} service={service} onOpen={openPanel} compact />
                ) : (
                  <PetWelcome
                    pending={operation.pending}
                    disabled={busy}
                    onCreate={(name) =>
                      void operation.run(
                        (signal) => service.create(name, signal),
                        '伙伴已加入营地',
                        onChange,
                      )
                    }
                  />
                )
              }
            </ResourceView>
            <OperationNotice notice={operation.notice?.error ? operation.notice : null} />
            <CareActions
              disabled={!pet || busy}
              pending={operation.pending}
              onCare={(action) =>
                pet &&
                void operation.run(
                  (signal) => service.care(action, pet.id, signal),
                  action === 'feed' ? '已喂食伙伴' : '已抚摸伙伴',
                  (result) => resource.accept({ ...pet, ...result }),
                )
              }
              onAuto={() => openPanel('auto')}
            />
          </section>
          <div className={styles.adventure}>
            <CampAdventure pet={pet} service={service} onSettled={onLotterySettled} />
            <ChallengeEntrances disabled={!pet} onSelect={(mode) => openPanel('challenge', mode)} />
            <p className={styles.footnote}>营地散步 · 不消耗积分，不产生收益</p>
          </div>
          <aside className={styles.inventory} aria-label="营地行囊">
            {pet ? (
              <ItemsPanel
                service={service}
                kind="bag"
                pet={pet}
                onChange={onChange}
                revision={inventoryRevision}
                onManage={() => openPanel('bag')}
              />
            ) : (
              <div className={styles.locked}>
                <Backpack size={32} aria-hidden="true" />
                <p>领养伙伴后开启行囊</p>
              </div>
            )}
          </aside>
        </div>
      </div>
      <PageFooterOutlet />
      {panel === 'cards' && cardCollection && (
        <PetCardsDialog
          port={cardCollection}
          userId={userId}
          onClose={closePanel}
          returnFocusRef={returnFocusRef}
        />
      )}
      {selected && panel !== 'cards' && pet && (
        <PanelDialog
          title={
            panel === 'challenge' && challengeMode === 'tournament' ? '武道大会' : selected.title
          }
          description={
            panel === 'challenge' && challengeMode === 'tournament'
              ? '查看排位，直接挑战更高名次。'
              : selected.description
          }
          onClose={closePanel}
          appearance="pixel"
          followVisualViewport={panel === 'shop'}
          returnFocusRef={returnFocusRef}
        >
          {panel === 'care' && <CarePanel service={service} pet={pet} onChange={onChange} />}
          {(panel === 'bag' || panel === 'catalog' || panel === 'shop') && (
            <ItemsPanel service={service} kind={panel} pet={pet} onChange={inventoryChanged} />
          )}
          {panel === 'skins' && (
            <SkinsPanel service={service} currentUrl={pet.url} onChange={onChange} />
          )}
          {panel === 'challenge' && challengeMode === 'tournament' && (
            <TournamentPanel service={service} userId={userId} onChange={onChange} />
          )}
          {panel === 'challenge' && challengeMode !== 'tournament' && (
            <ChallengePanel
              key={challengeMode}
              service={service}
              pet={pet}
              userId={userId}
              onChange={onChange}
              initialMode={challengeMode}
            />
          )}
          {panel === 'auto' && <AutoFeedPanel service={service} petId={pet.id} />}
          {panel === 'forge' && (
            <ForgePanel service={service} petId={pet.id} onChange={inventoryChanged} />
          )}
          {panel === 'supplies' && (
            <SupplyPanel
              service={service}
              onChange={async (signal) => {
                inventoryChanged();
                await onLotterySettled?.(signal);
              }}
              points={points}
            />
          )}
        </PanelDialog>
      )}
    </section>
  );
}
