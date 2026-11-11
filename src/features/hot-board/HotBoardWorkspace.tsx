import { useState, type ReactNode } from 'react';
import { SearchX } from 'lucide-react';
import type { HotBoardPort } from '@/domain/hot-board';
import { Button } from '@/shared/ui/Button';
import { useHotBoard } from './model/use-hot-board';
import { HotBoardSidebar } from './ui/HotBoardSidebar';
import { HotBoardHeader } from './ui/HotBoardHeader';
import { HotBoardToolbar } from './ui/HotBoardToolbar';
import { HotSourceCard } from './ui/HotSourceCard';
import { HotSourceConversation } from './ui/HotSourceConversation';
import { DemoComposer } from './ui/DemoComposer';
import { MobileSourcePicker } from './ui/MobileSourcePicker';
import { WpsHotTable } from './ui/WpsHotTable';
import styles from './ui/HotBoard.module.css';

interface HotBoardWorkspaceProps {
  service: HotBoardPort;
  presentation?: 'cards' | 'table';
  renderLayout: (slots: {
    sidebar: ReactNode;
    header: ReactNode;
    content: ReactNode;
    contentKey: string;
    footer: ReactNode;
  }) => ReactNode;
}

export function HotBoardWorkspace({
  service,
  renderLayout,
  presentation = 'cards',
}: HotBoardWorkspaceProps) {
  const { resource, refresh } = useHotBoard(service);
  const [sourceId, setSourceId] = useState('all');
  const [category, setCategory] = useState('all');
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const categories = Array.from(new Set(resource.sources.map((source) => source.category)));
  const selected = resource.sources.find((source) => source.id === sourceId);
  const effectiveSourceId = selected ? sourceId : 'all';
  const visible = resource.sources.filter(
    (source) =>
      (effectiveSourceId === 'all' || source.id === effectiveSourceId) &&
      (selected || !hiddenIds.includes(source.id)) &&
      (category === 'all' || source.category === category),
  );

  function selectSource(id: string) {
    setSourceId(id);
    setCategory('all');
  }
  function clearFilters() {
    setHiddenIds([]);
    setCategory('all');
    setSourceId('all');
  }

  return renderLayout({
    contentKey: effectiveSourceId,
    footer: selected ? (
      <div hidden={presentation === 'table'}>
        <DemoComposer key={selected.id} />
      </div>
    ) : null,
    sidebar: (
      <HotBoardSidebar
        sources={resource.sources}
        selectedId={effectiveSourceId}
        onSelect={selectSource}
        loading={resource.status === 'loading'}
      />
    ),
    header:
      presentation === 'table' ? null : (
        <HotBoardHeader
          title={selected?.name ?? '今日热榜'}
          onBack={selected ? clearFilters : null}
          sourcePicker={
            <MobileSourcePicker
              sources={resource.sources}
              selectedId={effectiveSourceId}
              onSelect={selectSource}
              loading={resource.status === 'loading'}
            />
          }
        />
      ),
    content:
      presentation === 'table' ? (
        <WpsHotTable
          sources={resource.sources}
          selectedId={effectiveSourceId}
          onSelect={selectSource}
          status={resource.status}
          {...(resource.status === 'error' ? { message: resource.message } : {})}
          onRefresh={refresh}
        />
      ) : (
        <div className={selected ? styles.detail : styles.board}>
          {!selected && (
            <HotBoardToolbar
              sources={resource.sources}
              categories={categories}
              category={category}
              hiddenIds={hiddenIds}
              onCategoryChange={(name) => {
                setCategory(name);
                setSourceId('all');
              }}
              onToggleSource={(id) =>
                setHiddenIds((previous) =>
                  previous.includes(id)
                    ? previous.filter((value) => value !== id)
                    : [...previous, id],
                )
              }
              onReset={() => setHiddenIds([])}
            />
          )}
          {resource.status === 'error' && (
            <div className={styles.error} role="alert">
              <span>
                {resource.message}
                {resource.sources.length > 0 && '；正在显示上次加载的内容。'}
              </span>
              <Button variant="secondary" onClick={refresh}>
                重试
              </Button>
            </div>
          )}
          {resource.status === 'loading' && (
            <p className={styles.feedback} role="status">
              {resource.sources.length ? '正在刷新热榜…' : '正在获取各平台热榜…'}
            </p>
          )}
          {resource.status === 'loading' && resource.sources.length === 0 ? (
            <div className={styles.grid} aria-hidden="true">
              {[1, 2, 3, 4].map((id) => (
                <div key={id} className={styles.skeleton}>
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          ) : null}
          {visible.length > 0 ? (
            selected && visible[0] ? (
              <HotSourceConversation source={visible[0]} />
            ) : (
              <div className={styles.grid}>
                {visible.map((source) => (
                  <HotSourceCard key={source.id} source={source} onOpen={selectSource} />
                ))}
              </div>
            )
          ) : resource.status === 'ready' || resource.sources.length > 0 ? (
            <div className={styles.empty}>
              <SearchX size={34} aria-hidden="true" />
              <h3>{resource.sources.length ? '没有找到相关内容' : '暂时没有热榜内容'}</h3>
              <p>
                {resource.sources.length
                  ? '试试其他关键词，或查看全部来源。'
                  : '各平台暂未返回内容，请稍后刷新。'}
              </p>
              <Button
                variant="secondary"
                onClick={resource.sources.length ? clearFilters : refresh}
              >
                {resource.sources.length ? '清除筛选' : '刷新热榜'}
              </Button>
            </div>
          ) : null}
        </div>
      ),
  });
}
