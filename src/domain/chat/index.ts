// 客户端领域模型；后端 DTO 必须在 infrastructure 映射后进入此边界。
export { encodeMusicMessage, parseMusicMessage } from './music-message';
export type { ChatMusicSong } from './music-message';
export type { ChatReportPort, ChatReportReason } from './report';
export type MessageId = string;
export type { ChatListAppearance, ChatListPreferencesPort } from './list-preferences';
export { defaultChatListAppearance, parseChatListAppearance } from './list-preferences';
export type { UserRemarks, ChatRemarksPort } from './remarks';
export { parseEmojiText } from './emoji';
export { parseInvitationText } from './game-invitation';
export type { InvitationGame } from './game-invitation';
export type { ChatImageUploadPort } from './image-upload';
export { senderTitle, memberLevelEmoji } from './sender-title';
export { sortMembersByLevel } from './member-order';
export type { ChatEmoticon, ChatEmoticonPort } from './emoticons';
export type ConversationId = string;
export {
  parseMessageContent,
  hasRewardMessageContent,
  chatImageUrl,
  messageClipboardText,
  messagePreview,
} from './message-content';
export type { MessageContentPart } from './message-content';
export type { RedPacketDetail, RedPacketRecord, RedPacketPort } from './red-packet';
export type { RedPacketCreateInput, RedPacketFormValues } from './red-packet';
export { RedPacketCreateError, validateRedPacketForm } from './red-packet';

export interface ReceivedMessage {
  poke?: { targetId: string; targetName: string; suffix: string };
  id: string;
  senderId: string;
  senderName: string;
  senderTitleId?: string;
  senderLevel?: number;
  senderRegion?: string;
  senderAvatar?: string | null;
  senderAvatarFrame?: string;
  content: string;
  createdAt: number;
  revoked: boolean;
  clientMessageId?: string;
  delivery?: 'sending' | 'failed' | 'sent' | undefined;
  sendError?: string | undefined;
  quote?: { id: string; senderName: string; content: string };
}
export type ChatEvent =
  { type: 'message'; message: ReceivedMessage } | { type: 'revoke'; id: string };
export type OnlineMembersEvent =
  | { type: 'members-snapshot' | 'members-online'; members: readonly OnlineMember[] }
  | { type: 'member-offline'; id: string };
export type ChatRealtimeEvent = ChatEvent | OnlineMembersEvent;
export type ChatConnectionState =
  'connecting' | 'connected' | 'reconnecting' | 'offline' | 'unauthorized' | 'closed';
export interface ChatConnection {
  close(): void;
  retry(): void;
  revoke(id: string): boolean;
}
export interface ChatRealtimePort {
  connect(
    onEvent: (event: ChatRealtimeEvent) => void,
    onState: (state: ChatConnectionState) => void,
  ): ChatConnection;
}

export interface ChatPreferencesPort {
  readHideAvatarFrames(): boolean;
  writeHideAvatarFrames(value: boolean): void;
  readDeferImages(): boolean;
  writeDeferImages(value: boolean): void;
  readShowAvatars(): boolean;
  writeShowAvatars(value: boolean): void;
  readGroupName(): string | null;
  writeGroupName(name: string): void;
}

export interface OnlineMember {
  id: string;
  name: string;
  avatar: string | null;
  avatarFrameUrl?: string | undefined;
  level?: number | undefined;
}

export interface OnlineMembersPort {
  loadOnlineMembers(signal: AbortSignal): Promise<readonly OnlineMember[]>;
}

export interface TextMessage {
  id: MessageId;
  conversationId: ConversationId;
  senderId: string;
  kind: 'text';
  content: string;
  createdAt: number;
  status: 'sending' | 'sent' | 'failed' | 'revoked';
  clientMessageId?: string;
}

export interface MessagePage {
  messages: readonly ReceivedMessage[];
  nextCursor: string | null;
}

export interface ChatHistoryPort {
  loadHistory(input: {
    conversationId: ConversationId;
    cursor: string | null;
    limit: number;
    signal?: AbortSignal;
  }): Promise<MessagePage>;
}

export interface SendMessageInput {
  pokeTargetId?: string;
  content: string;
  quotedMessageId?: string | undefined;
  clientMessageId: string;
}
export interface ChatSendPort {
  send(input: SendMessageInput, signal: AbortSignal): Promise<ReceivedMessage>;
}
export type {
  LuckyBagDetail,
  LuckyBagRecord,
  LuckyBagPort,
  LuckyBagCreateInput,
  LuckyBagFormValues,
} from './lucky-bag';
export { LuckyBagCreateError, validateLuckyBagForm } from './lucky-bag';
