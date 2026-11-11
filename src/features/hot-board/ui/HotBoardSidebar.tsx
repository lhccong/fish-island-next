import { useState } from 'react';
import { Flame, Search } from 'lucide-react';
import type { HotSource } from '@/domain/hot-board';
import { SourceAvatar } from '@/shared/ui/SourceAvatar';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { MobileSourcePicker } from './MobileSourcePicker';
import styles from './HotBoardSidebar.module.css';

interface HotBoardSidebarProps {
  sources: readonly HotSource[];
  selectedId: string;
  onSelect: (id: string) => void;
  loading: boolean;
}

export function HotBoardSidebar({ sources, selectedId, onSelect, loading }: HotBoardSidebarProps) {
  const [query, setQuery] = useState('');
  const filtered = sources.filter((source) =>
    source.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <div className={styles.sidebar}>
      <div className={styles.heading}>
        <span>发现</span>
        <span>热榜订阅</span>
      </div>
      <label className={styles.search}>
        <Search size={15} aria-hidden="true" />
        <input
          aria-label="搜索热榜来源"
          placeholder="搜索来源"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className={styles.mobileSelect}>
        <span>热榜来源</span>
        <MobileSourcePicker
          sources={sources}
          selectedId={selectedId}
          onSelect={onSelect}
          loading={loading}
        />
      </div>
      <ScrollArea className={styles.listContainer ?? ''} label="热榜来源滚动区">
        <nav className={styles.list} aria-label="选择热榜来源">
          <button
            type="button"
            className={styles.item}
            aria-pressed={selectedId === 'all'}
            onClick={() => onSelect('all')}
          >
            <span className={styles.allIcon}>
              <Flame size={21} aria-hidden="true" />
            </span>
            <span className={styles.itemText}>
              <strong>全部热榜</strong>
              <small>你关心的，全都在这里</small>
            </span>
            <span className={styles.count}>{sources.length}</span>
          </button>
          <div className={styles.sectionTitle}>
            全部来源 <span>{sources.length}</span>
          </div>
          {filtered.map((source) => (
            <button
              type="button"
              key={source.id}
              className={styles.item}
              aria-pressed={selectedId === source.id}
              onClick={() => onSelect(source.id)}
            >
              <SourceAvatar name={source.name} src={source.iconUrl} />
              <span className={styles.itemText}>
                <strong>{source.name}</strong>
                <small>{source.entries[0]?.title ?? '暂无内容'}</small>
              </span>
            </button>
          ))}
          {!filtered.length && (
            <p className={styles.notice}>{loading ? '正在加载来源…' : '没有匹配的来源'}</p>
          )}
        </nav>
      </ScrollArea>
      <div className={styles.bottom}>
        <span className={styles.dot} /> 微信风格 · 鱼岛工作台
      </div>
    </div>
  );
}
