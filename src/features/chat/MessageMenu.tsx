import { useRef, type ReactElement, type RefObject } from 'react';
import {
  MapPin,
  Pencil,
  AtSign,
  Copy,
  Quote,
  Repeat2,
  Undo2,
  ImagePlus,
  Ban,
  Flag,
  Hand,
} from 'lucide-react';
import { useChatReport } from './report-context';
import {
  hasRewardMessageContent,
  messageClipboardText,
  parseMessageContent,
  type ReceivedMessage,
} from '@/domain/chat';
import { useChatRealtime } from './realtime-context';
import { useRemarks } from './remarks-context';
import { ContextMenu } from '@/shared/ui/ContextMenu';
import { MessageActionBar, type MessageAction } from './MessageActionBar';

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
  const { controller, user, userId, draft, composerRef, emoticons, navigation, blacklist } =
    useChatRealtime();
  const remarks = useRemarks();
  const report = useChatReport();
  const reward = hasRewardMessageContent(message.content);
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
    if (reward) return;
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(messageClipboardText(message.content));
      draft.notify('已复制消息文字或图片链接');
    } catch {
      draft.notify('复制失败，请选中消息文字后手动复制', 'error');
    }
  };
  const items: MessageAction[] = [
    {
      label: '戳一戳',
      icon: <Hand size={16} aria-hidden="true" />,
      disabled: !user,
      onSelect: () => {
        if (user && !controller.sender.poke(message.senderId, message.senderName, user))
          draft.notify('戳一戳未提交，请处理待发送消息后重试', 'error');
      },
    },
    ...(!self
      ? [
          {
            label: '举报',
            shortcut: 'report' as const,
            icon: <Flag size={16} aria-hidden="true" />,
            onSelect: () => report({ id: message.id, senderId: message.senderId, returnFocusRef }),
          },
        ]
      : []),
    ...(!self
      ? [
          {
            label: '加入黑名单',
            icon: <Ban size={16} aria-hidden="true" />,
            onSelect: () => {
              focusDraft.current = true;
              composerRef.current?.focus({ preventScroll: true });
              try {
                blacklist.write(
                  userId,
                  [
                    ...blacklist.read(userId),
                    { id: message.senderId, name: message.senderName },
                  ].filter((item, index, all) => all.findIndex((v) => v.id === item.id) === index),
                );
                draft.notify('已屏蔽，可在我的黑名单中移除');
              } catch {
                draft.notify('无法保存黑名单，请检查浏览器存储权限', 'error');
              }
            },
          },
        ]
      : []),
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
    ...(!reward
      ? [
          {
            label: '复制',
            icon: <Copy size={16} aria-hidden="true" />,
            onSelect: () => {
              void copy();
            },
          },
        ]
      : []),
    {
      label: '引用',
      shortcut: 'quote',
      icon: <Quote size={16} aria-hidden="true" />,
      onSelect: () => prepare(() => draft.quote(message.id, message.senderName)),
    },
    {
      label: '@TA',
      icon: <AtSign size={16} aria-hidden="true" />,
      onSelect: () => prepare(() => draft.mention(message.senderName)),
    },
    ...(reward
      ? []
      : [
          {
            label: '复读机',
            shortcut: 'repeat' as const,
            icon: <Repeat2 size={16} aria-hidden="true" />,
            disabled: !user || message.content.length > 5000 || !message.content.trim(),
            onSelect: () => {
              if (!user) return;
              if (!controller.sender.repeat(message.content, user))
                draft.notify('复读未提交，请处理待发送消息后重试', 'error');
            },
          },
        ]),
    ...(user?.role === 'admin' || (self && !reward)
      ? [
          {
            label:
              status === 'pending' ? '等待撤回确认…' : status === 'error' ? '重试撤回' : '撤回',
            shortcut: 'revoke' as const,
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
    <MessageActionBar
      items={items}
      returnFocusRef={returnFocusRef}
      onCloseFocus={closeFocus}
      onAction={(item) => {
        item.onSelect();
        focusDraft.current = false;
      }}
    />
  );
}
