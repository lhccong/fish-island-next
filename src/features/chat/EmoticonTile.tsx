import { useRef, useState, useSyncExternalStore } from 'react';
import { Ellipsis, ZoomIn, Trash2, Star } from 'lucide-react';
import type { ChatEmoticon } from '@/domain/chat';
import { Button } from '@/shared/ui/Button';
import { ContextMenu } from '@/shared/ui/ContextMenu';
import { DropdownMenu, type DropdownMenuItem } from '@/shared/ui/DropdownMenu';
import { Dialog } from '@/shared/ui/Dialog';
import { HoverPreview } from '@/shared/ui/HoverPreview';
import { EmoticonPreview } from './EmoticonPreview';
import styles from './EmoticonPanel.module.css';

const touchQuery = '(max-width: 760px), (pointer: coarse)';
function subscribeTouch(change: () => void) {
  const media = window.matchMedia(touchQuery);
  media.addEventListener('change', change);
  return () => media.removeEventListener('change', change);
}
const readTouch = () => window.matchMedia(touchQuery).matches;

export function EmoticonTile({
  item,
  index,
  pending,
  saved,
  onSelect,
  onToggle,
}: {
  item: ChatEmoticon;
  index: number;
  pending: boolean;
  saved: boolean;
  onSelect: () => void;
  onToggle: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const [preview, setPreview] = useState(false);
  const picture = useRef<HTMLButtonElement>(null);
  const touch = useSyncExternalStore(subscribeTouch, readTouch, () => false);
  const items: DropdownMenuItem[] = [
    {
      label: '放大预览',
      icon: <ZoomIn size={16} aria-hidden="true" />,
      onSelect: () => setPreview(true),
    },
    {
      label: saved ? '移除表情包' : '收藏表情包',
      icon: saved ? <Trash2 size={16} aria-hidden="true" /> : <Star size={16} aria-hidden="true" />,
      disabled: pending,
      ...(saved ? { tone: 'danger' as const } : {}),
      onSelect: onToggle,
    },
  ];
  return (
    <div className={styles.tile}>
      <HoverPreview
        disabled={preview || touch}
        label={`表情包 ${index + 1} 放大预览`}
        content={<EmoticonPreview url={item.url} />}
      >
        {(descriptionId) => (
          <ContextMenu
            disabled={touch}
            label={`表情包 ${index + 1} 操作`}
            className={styles.tileMenu ?? ''}
            items={items}
            returnFocusRef={picture}
          >
            <button
              ref={picture}
              type="button"
              className={styles.picture}
              onClick={onSelect}
              aria-label={`使用表情包 ${index + 1}`}
              aria-describedby={descriptionId}
              onContextMenu={(event) => {
                if (touch) event.preventDefault();
              }}
            >
              {failed ? (
                <span>
                  图片不可用
                  <br />
                  点击仍可加入草稿
                </span>
              ) : (
                <img
                  src={item.url}
                  width={96}
                  height={96}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  alt={`表情包 ${index + 1}`}
                  onError={() => setFailed(true)}
                />
              )}
            </button>
          </ContextMenu>
        )}
      </HoverPreview>
      <DropdownMenu
        label={`表情包 ${index + 1} 操作`}
        className={styles.tileMenu ?? ''}
        items={items}
        returnFocusRef={picture}
        trigger={
          <Button
            variant="secondary"
            className={styles.tileMore ?? ''}
            aria-label={`表情包 ${index + 1} 操作`}
          >
            <Ellipsis size={18} aria-hidden="true" />
          </Button>
        }
      />
      <Dialog
        open={preview}
        onOpenChange={setPreview}
        title="表情包预览"
        description="预览不会发送图片，关闭后可继续选择表情包。"
        className={styles.previewDialog ?? ''}
        returnFocusRef={picture}
        dismissLabel="关闭预览"
        showCloseAction={false}
      >
        {preview && <EmoticonPreview url={item.url} />}
      </Dialog>
    </div>
  );
}
