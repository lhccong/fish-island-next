import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useCallback, useContext, useState } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Popover } from '@/shared/ui/Popover';
import { SearchForm } from '@/shared/ui/SearchForm';
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
  const [{ keyword, submitted }, setQuery] = useState({ keyword: '', submitted: 0 });
  return (
    <>
      <div className={styles.search}>
        <SearchForm
          label="搜索收藏表情包"
          placeholder="输入图片里的文字"
          keyword={keyword}
          onSearch={(value) =>
            setQuery((query) => ({ keyword: value, submitted: query.submitted + 1 }))
          }
        />
      </div>
      <SavedEmoticonList key={submitted} keyword={keyword} onSelect={onSelect} />
    </>
  );
}

function SavedEmoticonList({
  keyword,
  onSelect,
}: {
  keyword: string;
  onSelect: (url: string) => void;
}) {
  const port = useContext(CommentEmoticonsContext);
  const load = useCallback(
    (page: number, signal: AbortSignal) => {
      if (!port) return Promise.reject(new Error('表情包暂不可用，请重新进入鱼小圈'));
      return port.list(page, signal, keyword);
    },
    [port, keyword],
  );
  const pages = useInfinitePages(load);
  return (
    <ScrollArea label="评论表情包列表" gutter="reserved" className={styles.scroll || ''}>
      {pages.result.status === 'loading' && <LoadingIndicator>正在加载表情包…</LoadingIndicator>}
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
            <p>
              {keyword
                ? '没有找到表情包，请换个关键词。'
                : '还没有收藏表情包，可在聊天图片菜单中添加收藏，也可直接粘贴图片。'}
            </p>
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
