import { useCallback, useState } from 'react';
import { useStore } from 'zustand';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { InfiniteScroll, useInfinitePages } from '@/shared/ui/InfiniteScroll';
import { useChatRealtime } from './realtime-context';
import { EmoticonTile } from './EmoticonTile';
import { EmoticonFeedback } from './EmoticonFeedback';
import styles from './EmoticonPanel.module.css';

export default function EmoticonPanel({ onSelect }: { onSelect: () => void }) {
  const { emoticons, draft, composerRef } = useChatRealtime();
  const revision = useStore(emoticons.store, (s) => s.revision);
  const pending = useStore(emoticons.store, (s) => s.pending);
  const [input, setInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(
    async (page: number, signal: AbortSignal) => {
      // 收藏写入成功后才使列表失效；搜索不因收藏而重取。
      if (keyword) {
        return emoticons.port.search(keyword, page, signal);
      }
      return emoticons.port.list(page, signal);
    },
    [emoticons, keyword],
  );
  return (
    <>
      <form
        className={styles.search}
        onSubmit={(event) => {
          event.preventDefault();
          setKeyword(input.trim());
        }}
      >
        <input
          aria-label="搜索表情包"
          placeholder="输入关键词搜索表情包"
          maxLength={80}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button type="submit">搜索</Button>
        <Button
          variant="secondary"
          onClick={() => {
            setInput('');
            setKeyword('');
          }}
        >
          我的收藏
        </Button>
      </form>
      <EmoticonList
        key={keyword ? `search:${keyword}` : `saved:${revision}`}
        load={load}
        saved={!keyword}
        pending={pending}
        onSelect={(url) => {
          const text = draft.store.getState().text;
          const start = composerRef.current?.selectionStart ?? text.length;
          const end = composerRef.current?.selectionEnd ?? start;
          const marker = `[img]${url}[/img]`;
          if (text.length - (end - start) + marker.length > 5000) {
            setNotice('消息不能超过 5000 字，请关闭面板并缩短草稿后重试');
            draft.notify('消息不能超过 5000 字，请先缩短草稿', 'error');
            return;
          }
          draft.setText(text.slice(0, start) + marker + text.slice(end));
          draft.notify('表情包已加入草稿');
          onSelect();
        }}
        onToggle={(id, url) => {
          void (keyword ? emoticons.add(url) : emoticons.remove(id));
        }}
      />
      <div className={styles.feedback}>
        {notice && (
          <span role="alert" data-tone="error">
            {notice}
          </span>
        )}
        <EmoticonFeedback />
      </div>
    </>
  );
}

import type { ChatEmoticon } from '@/domain/chat';
function EmoticonList({
  load,
  saved,
  pending,
  onSelect,
  onToggle,
}: {
  load: (page: number, signal: AbortSignal) => Promise<{ items: ChatEmoticon[]; total: number }>;
  saved: boolean;
  pending: boolean;
  onSelect: (url: string) => void;
  onToggle: (id: string, url: string) => void;
}) {
  const pages = useInfinitePages(load);
  return (
    <ScrollArea label="表情包列表" gutter="reserved" className={styles.scroll ?? ''}>
      {pages.result.status === 'loading' && <p role="status">正在加载表情包…</p>}
      {pages.result.status === 'error' && (
        <div role="alert">
          <p>{pages.result.message}</p>
          <Button variant="secondary" onClick={pages.refresh}>
            重试表情包
          </Button>
        </div>
      )}
      {pages.result.status === 'ready' && (
        <>
          <p className={styles.caption}>{saved ? '我的收藏' : '搜索结果'}</p>
          {pages.result.data.items.length === 0 && (
            <p>
              {saved
                ? '还没有收藏，打开聊天图片的消息菜单，选择“添加表情包”。'
                : '没有找到表情包，请换个关键词。'}
            </p>
          )}
          <div className={styles.grid}>
            {pages.result.data.items.map((item, index) => (
              <EmoticonTile
                key={item.id}
                item={item}
                index={index}
                saved={saved}
                pending={pending}
                onSelect={() => onSelect(item.url)}
                onToggle={() => onToggle(item.id, item.url)}
              />
            ))}
          </div>
          <InfiniteScroll
            label="表情包"
            loading={pages.loadingMore}
            error={pages.error}
            hasMore={pages.hasMore}
            onLoadMore={pages.loadMore}
          />
        </>
      )}
    </ScrollArea>
  );
}
