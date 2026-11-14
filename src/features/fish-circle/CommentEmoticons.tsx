import { useCallback, useContext, useState } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Popover } from '@/shared/ui/Popover';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { InfiniteScroll, useInfinitePages } from '@/shared/ui/InfiniteScroll';
import { CommentEmoticonsContext } from './comment-emoticons-context';
import styles from './CommentEmoticons.module.css';

export function CommentEmoticons({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      label="评论表情包"
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button
          variant="secondary"
          className={styles.icon || ''}
          aria-label="评论表情包"
          disabled={disabled}
        >
          <Smile size={20} aria-hidden="true" />
        </Button>
      }
    >
      {open && (
        <SavedEmoticons
          onSelect={(url) => {
            onSelect(url);
            setOpen(false);
          }}
        />
      )}
    </Popover>
  );
}
function SavedEmoticons({ onSelect }: { onSelect: (url: string) => void }) {
  const port = useContext(CommentEmoticonsContext);
  const load = useCallback(
    (page: number, signal: AbortSignal) => {
      if (!port) return Promise.reject(new Error('表情包暂不可用，请重新进入鱼小圈'));
      return port.list(page, signal);
    },
    [port],
  );
  const pages = useInfinitePages(load);
  return (
    <ScrollArea label="评论表情包列表" gutter="reserved" className={styles.scroll || ''}>
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
          {pages.result.data.items.length === 0 && (
            <p>还没有收藏表情包，可在聊天图片菜单中添加收藏，也可直接粘贴图片。</p>
          )}
          <div className={styles.grid}>
            {pages.result.data.items.map((item, index) => (
              <EmoticonButton key={item.id} url={item.url} index={index} onSelect={onSelect} />
            ))}
          </div>
          <InfiniteScroll
            label="表情包"
            hasMore={pages.hasMore}
            loading={pages.loadingMore}
            error={pages.error}
            onLoadMore={pages.loadMore}
          />
        </>
      )}
    </ScrollArea>
  );
}

function EmoticonButton({
  url,
  index,
  onSelect,
}: {
  url: string;
  index: number;
  onSelect: (url: string) => void;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <button
      type="button"
      aria-label={`选择表情包 ${index + 1}`}
      disabled={failed}
      onClick={() => onSelect(url)}
    >
      {failed ? (
        '图片加载失败'
      ) : (
        <img
          src={url}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      )}
    </button>
  );
}
