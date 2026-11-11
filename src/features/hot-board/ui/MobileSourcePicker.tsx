import { useState } from 'react';
import { Check, ChevronDown, Flame, Search } from 'lucide-react';
import type { HotSource } from '@/domain/hot-board';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { SourceAvatar } from '@/shared/ui/SourceAvatar';
import styles from './MobileSourcePicker.module.css';

interface MobileSourcePickerProps {
  sources: readonly HotSource[];
  selectedId: string;
  onSelect: (id: string) => void;
  loading: boolean;
}

export function MobileSourcePicker({
  sources,
  selectedId,
  onSelect,
  loading,
}: MobileSourcePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = sources.find((source) => source.id === selectedId);
  const filtered = sources.filter((source) =>
    source.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  function choose(id: string) {
    onSelect(id);
    setOpen(false);
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setQuery('');
      }}
      title="选择热榜来源"
      description="切换来源，查看你关心的热点"
      className={styles.panel ?? ''}
      showCloseAction={false}
      dismissLabel="关闭来源选择"
      trigger={
        <button
          type="button"
          className={styles.trigger}
          aria-label={`热榜来源：${selected?.name ?? '全部热榜'}`}
        >
          {selected ? (
            <SourceAvatar name={selected.name} src={selected.iconUrl} />
          ) : (
            <Flame size={19} aria-hidden="true" />
          )}
          <span>{selected?.name ?? '全部热榜'}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      }
    >
      <label className={styles.search}>
        <Search size={17} aria-hidden="true" />
        <input
          aria-label="搜索可选热榜来源"
          placeholder="搜索热榜来源"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <ScrollArea label="可选热榜来源" className={styles.scroll ?? ''}>
        <div className={styles.options}>
          <button
            type="button"
            className={styles.option}
            aria-pressed={selectedId === 'all'}
            onClick={() => choose('all')}
          >
            <span className={styles.allIcon}>
              <Flame size={20} aria-hidden="true" />
            </span>
            <span>全部热榜</span>
            {selectedId === 'all' ? (
              <Check size={18} aria-hidden="true" />
            ) : (
              <small>{sources.length}</small>
            )}
          </button>
          <p className={styles.caption}>热榜来源 · {filtered.length}</p>
          {filtered.map((source) => (
            <button
              key={source.id}
              type="button"
              className={styles.option}
              aria-pressed={selectedId === source.id}
              onClick={() => choose(source.id)}
            >
              <SourceAvatar name={source.name} src={source.iconUrl} />
              <span>{source.name}</span>
              {selectedId === source.id && <Check size={18} aria-hidden="true" />}
            </button>
          ))}
          {!filtered.length && (
            <p className={styles.empty}>
              {loading
                ? '正在加载来源…'
                : query.trim()
                  ? '没有匹配的来源，试试其他关键词'
                  : '暂无热榜来源'}
            </p>
          )}
        </div>
      </ScrollArea>
    </Dialog>
  );
}
