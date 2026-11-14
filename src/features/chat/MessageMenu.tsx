import { useRef, type ReactElement, type RefObject } from 'react';
import {
  MapPin,
  Pencil,
  AtSign,
  Copy,
  MoreHorizontal,
  Quote,
  Repeat2,
  Undo2,
  ImagePlus,
} from 'lucide-react';
import { messageClipboardText, parseMessageContent, type ReceivedMessage } from '@/domain/chat';
import { useChatRealtime } from './realtime-context';
import { useRemarks } from './remarks-context';
import { ContextMenu } from '@/shared/ui/ContextMenu';
import { DropdownMenu, type DropdownMenuItem } from '@/shared/ui/DropdownMenu';
import { Button } from '@/shared/ui/Button';
import styles from './MessageMenu.module.css';

interface Props {
  message: ReceivedMessage;
  self: boolean;
  presentation: 'context' | 'button';
  children?: ReactElement;
  connected: boolean;
  status: 'pending' | 'error' | undefined;
  onRevoke: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}
export function MessageMenu({
  message,
  self,
  presentation,
  children,
  connected,
  status,
  onRevoke,
  returnFocusRef,
}: Props) {
  const { controller, user, draft, composerRef, emoticons, navigation } = useChatRealtime();
  const remarks = useRemarks();
  const focusDraft = useRef(false);
  const closeFocus = () => {
    const target = focusDraft.current ? composerRef.current : returnFocusRef.current;
    focusDraft.current = false;
    if (target?.isConnected) target.focus({ preventScroll: true });
  };
  const prepare = (action: () => void) => {
    focusDraft.current = true;
    action();
    composerRef.current?.focus({ preventScroll: true });
  };
  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(messageClipboardText(message.content));
      draft.notify('已复制消息文字或图片链接');
    } catch {
      draft.notify('复制失败，请选中消息文字后手动复制', 'error');
    }
  };
  const items: DropdownMenuItem[] = [
    {
      label: '设置备注',
      icon: <Pencil size={16} aria-hidden="true" />,
      onSelect: () =>
        remarks.open({ id: message.senderId, name: message.senderName, returnFocusRef }),
    },
    ...(message.quote
      ? [
          {
            label: '定位原文',
            icon: <MapPin size={16} aria-hidden="true" />,
            onSelect: () => {
              void navigation.locate(message.quote!.id);
            },
          },
        ]
      : []),
    ...parseMessageContent(message.content)
      .filter((part) => part.kind === 'image')
      .map((part, index, images) => ({
        label: images.length === 1 ? '添加表情包' : `添加表情包（图片 ${index + 1}）`,
        icon: <ImagePlus size={16} aria-hidden="true" />,
        onSelect: () => {
          void emoticons.add(part.url);
        },
      })),
    {
      label: '复制',
      icon: <Copy size={16} aria-hidden="true" />,
      onSelect: () => {
        void copy();
      },
    },
    {
      label: '引用',
      icon: <Quote size={16} aria-hidden="true" />,
      onSelect: () => prepare(() => draft.quote(message.id, message.senderName)),
    },
    {
      label: '@TA',
      icon: <AtSign size={16} aria-hidden="true" />,
      onSelect: () => prepare(() => draft.mention(message.senderName)),
    },
    {
      label: '复读机',
      icon: <Repeat2 size={16} aria-hidden="true" />,
      disabled: !user || message.content.length > 5000 || !message.content.trim(),
      onSelect: () => {
        if (!user) return;
        if (!controller.sender.repeat(message.content, user))
          draft.notify('复读未提交，请处理待发送消息后重试', 'error');
      },
    },
    ...(self
      ? [
          {
            label:
              status === 'pending' ? '等待撤回确认…' : status === 'error' ? '重试撤回' : '撤回',
            icon: <Undo2 size={16} aria-hidden="true" />,
            tone: 'danger' as const,
            disabled: message.revoked || !connected || status === 'pending',
            onSelect: onRevoke,
          },
        ]
      : []),
  ];
  if (presentation === 'context' && children)
    return (
      <ContextMenu
        label="消息操作"
        items={items}
        disabled={message.revoked}
        returnFocusRef={returnFocusRef}
        onCloseFocus={closeFocus}
      >
        {children}
      </ContextMenu>
    );
  if (message.revoked) return null;
  return (
    <DropdownMenu
      label="消息操作"
      items={items}
      returnFocusRef={returnFocusRef}
      onCloseFocus={closeFocus}
      trigger={
        <Button variant="secondary" className={styles.more} aria-label="更多消息操作">
          <MoreHorizontal size={18} aria-hidden="true" />
        </Button>
      }
    />
  );
}
