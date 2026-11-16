import { lazy, Suspense, useRef, useState } from 'react';
import { Gift, ImagePlus, List, Mail, Maximize2, PictureInPicture2, Plus } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { DropdownMenu, type DropdownMenuItem } from '@/shared/ui/DropdownMenu';
import { Dialog } from '@/shared/ui/Dialog';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useChatRealtime } from './realtime-context';
import styles from './SendRedPacket.module.css';

const RedPacket = lazy(() => import('./SendRedPacketForm'));
const LuckyBag = lazy(() => import('./SendLuckyBagForm'));
const ActiveBags = lazy(() => import('./ActiveLuckyBags'));
type Panel = 'red-packet' | 'lucky-bag' | 'active-bags' | null;

export function ChatToolsMenu({
  className,
  floating,
  onToggleFloating,
  onUploadImage,
  imageDisabled,
}: {
  className: string;
  floating: boolean;
  onToggleFloating?: (() => void) | undefined;
  onUploadImage: () => void;
  imageDisabled: boolean;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const { luckyBags } = useChatRealtime();
  const openPanel = (next: Panel) => {
    setPanel(next);
  };
  const items: DropdownMenuItem[] = [
    {
      label: '发红包',
      icon: <Mail size={18} aria-hidden="true" />,
      onSelect: () => openPanel('red-packet'),
    },
    {
      label: '发福袋',
      icon: <Gift size={18} aria-hidden="true" />,
      onSelect: () => openPanel('lucky-bag'),
    },
    {
      label: '进行中的福袋',
      icon: <List size={18} aria-hidden="true" />,
      onSelect: () => {
        openPanel('active-bags');
        void luckyBags.active.load();
      },
    },
    {
      label: '上传图片',
      icon: <ImagePlus size={18} aria-hidden="true" />,
      onSelect: onUploadImage,
      disabled: imageDisabled,
    },
  ];
  if (onToggleFloating)
    items.push({
      label: floating ? '返回完整聊天' : '小窗模式',
      icon: floating ? (
        <Maximize2 size={18} aria-hidden="true" />
      ) : (
        <PictureInPicture2 size={18} aria-hidden="true" />
      ),
      onSelect: onToggleFloating,
      separatorBefore: true,
    });
  return (
    <>
      <DropdownMenu
        label="聊天工具"
        side="top"
        align="start"
        presentation="chat-tools"
        items={items}
        {...(panel !== null ? { onCloseFocus: () => undefined } : {})}
        trigger={
          <Button ref={trigger} variant="secondary" className={className} aria-label="更多聊天工具">
            <Plus size={24} aria-hidden="true" />
          </Button>
        }
      />
      <Dialog
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open) openPanel(null);
        }}
        returnFocusRef={trigger}
        className={styles.dialog ?? ''}
        showCloseAction={false}
        title={
          panel === 'red-packet' ? '发送红包' : panel === 'lucky-bag' ? '发送福袋' : '进行中的福袋'
        }
        description="当前群聊的聊天工具"
        hideDescription
        dismissLabel={panel === 'red-packet' ? '关闭发送红包' : '关闭福袋面板'}
      >
        {panel !== null && (
          <Suspense fallback={<LoadingIndicator>正在加载聊天工具…</LoadingIndicator>}>
            {panel === 'red-packet' ? (
              <RedPacket onClose={() => openPanel(null)} />
            ) : panel === 'lucky-bag' ? (
              <LuckyBag onClose={() => openPanel(null)} />
            ) : (
              <ActiveBags />
            )}
          </Suspense>
        )}
      </Dialog>
    </>
  );
}
