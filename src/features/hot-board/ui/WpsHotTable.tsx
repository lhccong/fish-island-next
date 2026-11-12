import { useState } from 'react';
import {
  ArrowDownWideNarrow,
  Hash,
  ListFilter,
  RefreshCw,
  Search,
  Table2,
  Type,
} from 'lucide-react';
import type { HotSource } from '@/domain/hot-board';
import { Select } from '@/shared/ui/Select';
import { formatHeat, relativeUpdate } from './legacy-format';
import styles from './WpsHotTable.module.css';

interface WpsHotTableProps {
  sources: readonly HotSource[];
  selectedId: string;
  onSelect: (id: string) => void;
  status: 'loading' | 'ready' | 'error';
  message?: string;
  onRefresh: () => void;
}

export function WpsHotTable({
  sources,
  selectedId,
  onSelect,
  status,
  message,
  onRefresh,
}: WpsHotTableProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<'rank' | 'heat'>('rank');
  const categories = Array.from(new Set(sources.map((source) => source.category)));
  const needle = query.trim().toLocaleLowerCase();
  const rows = sources
    .filter(
      (source) =>
        (selectedId === 'all' || source.id === selectedId) &&
        (category === 'all' || source.category === category),
    )
    .flatMap((source) => source.entries.map((entry) => ({ source, entry })))
    .filter(({ source, entry }) =>
      `${entry.title} ${source.name} ${source.category}`.toLocaleLowerCase().includes(needle),
    )
    .sort((a, b) =>
      sort === 'rank' ? a.entry.rank - b.entry.rank : (b.entry.heat ?? -1) - (a.entry.heat ?? -1),
    );

  function reset() {
    setQuery('');
    setCategory('all');
    onSelect('all');
  }

  return (
    <section className={styles.sheet} aria-label="热榜多维表格">
      <header className={styles.heading}>
        <h1>
          <Table2 size={18} aria-hidden="true" />
          今日热榜
        </h1>
        <span>只读数据表</span>
      </header>
      <div className={styles.toolbar} aria-label="热榜表格工具">
        <div className={styles.source}>
          <Table2 size={15} aria-hidden="true" />
          <Select
            label="筛选热榜来源"
            value={selectedId}
            onValueChange={onSelect}
            options={[
              { value: 'all', label: '全部来源' },
              ...sources.map((source) => ({ value: source.id, label: source.name })),
            ]}
          />
        </div>
        <div className={styles.category}>
          <ListFilter size={15} aria-hidden="true" />
          <Select
            label="筛选热榜分类"
            value={category}
            onValueChange={setCategory}
            options={[
              { value: 'all', label: '全部分类' },
              ...categories.map((name) => ({ value: name, label: name })),
            ]}
          />
        </div>
        <button
          type="button"
          onClick={() => setSort(sort === 'rank' ? 'heat' : 'rank')}
          aria-label={sort === 'rank' ? '按热度排序' : '按排名排序'}
        >
          <ArrowDownWideNarrow size={16} aria-hidden="true" />
          {sort === 'rank' ? '排名排序' : '热度排序'}
        </button>
        <button type="button" onClick={onRefresh} disabled={status === 'loading'}>
          <RefreshCw size={15} aria-hidden="true" />
          刷新
        </button>
        <label className={styles.search}>
          <Search size={15} aria-hidden="true" />
          <input
            aria-label="查找热榜"
            type="search"
            placeholder="查找标题、来源"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      {status === 'loading' && (
        <p className={styles.feedback} role="status">
          {sources.length ? '正在刷新热榜…' : '正在获取各平台热榜…'}
        </p>
      )}
      {status === 'error' && (
        <div className={styles.error} role="alert">
          <span>
            {message ?? '热榜加载失败'}
            {sources.length > 0 && '；正在显示上次加载的内容。'}
          </span>
          <button type="button" onClick={onRefresh}>
            重试
          </button>
        </div>
      )}
      <div className={styles.frame}>
        <table className={styles.table} aria-label="热榜数据" aria-busy={status === 'loading'}>
          <thead>
            <tr>
              <th className={styles.rank} scope="col">
                <Hash size={13} aria-hidden="true" />
                <span>排名</span>
              </th>
              <th className={styles.title} scope="col">
                <Type size={14} aria-hidden="true" />
                热榜标题
              </th>
              <th className={styles.desktop} scope="col">
                来源
              </th>
              <th className={styles.desktop} scope="col">
                分类
              </th>
              <th className={styles.desktop} scope="col">
                热度
              </th>
              <th className={styles.desktop} scope="col">
                更新时间
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ source, entry }) => (
              <tr key={`${source.id}:${entry.id}`}>
                <td className={styles.rank}>{entry.rank}</td>
                <td className={styles.title}>
                  {entry.url ? (
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                    >
                      {entry.title}
                    </a>
                  ) : (
                    <span className={styles.entryTitle}>{entry.title}</span>
                  )}
                  <span className={styles.mobileMeta}>
                    {source.name} · {source.category}
                    {entry.heat !== null && ` · ${formatHeat(entry.heat)}`}
                  </span>
                </td>
                <td className={styles.desktop}>
                  <span className={styles.tag}>{source.name}</span>
                </td>
                <td className={styles.desktop}>{source.category}</td>
                <td className={styles.desktop}>
                  {entry.heat === null ? '—' : formatHeat(entry.heat)}
                </td>
                <td className={styles.desktop} title={source.updatedAt ?? '更新时间未知'}>
                  {source.updatedAt ? relativeUpdate(source.updatedAt) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 &&
          status !== 'loading' &&
          (status !== 'error' || sources.length > 0) && (
            <div className={styles.empty}>
              <Table2 size={28} aria-hidden="true" />
              <h2>
                {!sources.length
                  ? '暂时没有热榜内容'
                  : query || category !== 'all'
                    ? '没有找到相关内容'
                    : '该来源暂无内容'}
              </h2>
              <p>
                {!sources.length
                  ? '各平台暂未返回内容，请稍后刷新。'
                  : '试试其他关键词、分类或来源。'}
              </p>
              <button type="button" onClick={sources.length ? reset : onRefresh}>
                {sources.length ? '清除筛选' : '刷新热榜'}
              </button>
            </div>
          )}
      </div>
      <footer className={styles.summary}>
        共 {rows.length} 条记录 · {sources.length} 个来源
      </footer>
    </section>
  );
}
