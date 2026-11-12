import { useCallback, useState } from 'react';
import {
  Apple,
  Heart,
  PawPrint,
  Backpack,
  Palette,
  Swords,
  BookOpen,
  ShoppingBag,
  Settings2,
  Hammer,
  Gift,
} from 'lucide-react';
import type { PetPort } from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { usePetOperation, usePetResource } from './resource';
import { ResourceView, OperationNotice } from './Feedback';
import { CampScene } from './CampScene';
import { CompanionSummary } from './CompanionSummary';
import { PanelDialog } from './PanelDialog';
import { CarePanel } from './CarePanel';
import { ItemsPanel } from './ItemsPanel';
import { SkinsPanel } from './SkinsPanel';
import { ChallengePanel } from './ChallengePanel';
import { AutoFeedPanel } from './AutoFeedPanel';
import { ForgePanel } from './ForgePanel';
import { SupplyPanel } from './SupplyPanel';
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
    title: '幸运补给',
    icon: Gift,
    description: '查看活动奖励与领取记录，积分消耗需确认。',
  },
] as const;
type PanelId = (typeof panels)[number]['id'];

export function PetWorkspace({ service, userId }: { service: PetPort; userId: string }) {
  const load = useCallback((signal: AbortSignal) => service.mine(signal), [service]);
  const resource = usePetResource(load);
  const pet = resource.data ?? null;
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [name, setName] = useState('');
  const operation = usePetOperation();
  const selected = panels.find((item) => item.id === panel);
  const busy = operation.pending || resource.state.status === 'loading';
  const onChange = resource.reload;
  return (
    <section aria-label="伙伴营地" className={styles.scroll}>
      <div className={styles.workspace}>
        <header className={styles.intro}>
          <div>
            <span className={styles.eyebrow}>FISH ISLAND · COMPANIONS</span>
            <h1>伙伴营地</h1>
            <p>一起散步，一起长大。</p>
          </div>
          <span className={styles.tag}>
            <span />
            岛屿日常
          </span>
        </header>
        <ResourceView state={resource.state} reload={resource.reload}>
          {(data) =>
            data ? (
              <CompanionSummary pet={data} />
            ) : (
              <section className={styles.welcome}>
                <PawPrint size={28} aria-hidden="true" />
                <div>
                  <h2>营地正等着第一位伙伴</h2>
                  <p>给它起个名字，开启你们的岛屿日常。</p>
                </div>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void operation.run(
                      (signal) => service.create(name.trim(), signal),
                      '伙伴已加入营地',
                      onChange,
                    );
                  }}
                >
                  <input
                    aria-label="新伙伴名字"
                    placeholder="输入伙伴名字"
                    maxLength={20}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                  <Button type="submit" disabled={busy || !name.trim()}>
                    {operation.pending ? '正在领养…' : '领养伙伴'}
                  </Button>
                </form>
              </section>
            )
          }
        </ResourceView>
        <OperationNotice notice={operation.notice} />
        <CampScene pet={pet} />
        <div className={styles.careBar}>
          <span>{pet ? '陪伴，让每一天都有回应。' : '领养后可解锁养成、装备与挑战。'}</span>
          <div>
            <Button
              variant="secondary"
              disabled={!pet || busy}
              onClick={() =>
                pet &&
                void operation.run(
                  (signal) => service.care('pat', pet.id, signal),
                  '已抚摸伙伴',
                  onChange,
                )
              }
            >
              <Heart size={15} />
              抚摸 · 3 积分
            </Button>
            <Button
              disabled={!pet || busy}
              onClick={() =>
                pet &&
                void operation.run(
                  (signal) => service.care('feed', pet.id, signal),
                  '已喂食伙伴',
                  onChange,
                )
              }
            >
              <Apple size={15} />
              喂食 · 5 积分
            </Button>
          </div>
        </div>
        <nav className={styles.tools} aria-label="伙伴功能">
          {panels.map(({ id, title, icon: Icon }, index) => (
            <button
              key={id}
              type="button"
              className={styles.tool}
              disabled={!pet}
              onClick={() => setPanel(id)}
            >
              <span className={styles.toolIcon} data-tone={index % 3}>
                <Icon size={22} aria-hidden="true" />
              </span>
              <strong>{title}</strong>
              <small>
                {
                  [
                    '成长与属性',
                    '物品与装备',
                    '伙伴新模样',
                    '切磋与试炼',
                    '收集与了解',
                    '旅途的补给',
                    '日常照料',
                    '词条与升级',
                    '活动与奖励',
                  ][index]
                }
              </small>
            </button>
          ))}
        </nav>
        <p className={styles.footnote}>营地移动仅为本地互动 · 养成与挑战结果以服务端记录为准</p>
      </div>
      {selected && pet && (
        <PanelDialog
          title={selected.title}
          description={selected.description}
          onClose={() => setPanel(null)}
        >
          {panel === 'care' && <CarePanel service={service} pet={pet} onChange={onChange} />}
          {(panel === 'bag' || panel === 'catalog' || panel === 'shop') && (
            <ItemsPanel service={service} kind={panel} pet={pet} onChange={onChange} />
          )}
          {panel === 'skins' && (
            <SkinsPanel service={service} currentUrl={pet.url} onChange={onChange} />
          )}
          {panel === 'challenge' && (
            <ChallengePanel service={service} pet={pet} userId={userId} onChange={onChange} />
          )}
          {panel === 'auto' && <AutoFeedPanel service={service} petId={pet.id} />}
          {panel === 'forge' && <ForgePanel service={service} petId={pet.id} onChange={onChange} />}
          {panel === 'supplies' && <SupplyPanel service={service} onChange={onChange} />}
        </PanelDialog>
      )}
    </section>
  );
}
