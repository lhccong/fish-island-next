// 客户端领域模型；后端 DTO 必须在 infrastructure 映射后进入此边界。
export type MessageId = string;
export type { UserRemarks, ChatRemarksPort } from './remarks';
export { parseEmojiText } from './emoji';
export type { ChatImageUploadPort } from './image-upload';
export { senderTitle } from './sender-title';
export type { ChatEmoticon, ChatEmoticonPort } from './emoticons';
export type ConversationId = string;
export {
  parseMessageContent,
  chatImageUrl,
  messageClipboardText,
  messagePreview,
} from './message-content';
export type { MessageContentPart } from './message-content';
export type { RedPacketDetail, RedPacketRecord, RedPacketPort } from './red-packet';
export type { RedPacketCreateInput, RedPacketFormValues } from './red-packet';
export { RedPacketCreateError, validateRedPacketForm } from './red-packet';

export interface ReceivedMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderTitleId?: string;
  senderLevel?: number;
  senderAvatar?: string | null;
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
export type ChatConnectionState =
  'connecting' | 'connected' | 'reconnecting' | 'offline' | 'unauthorized' | 'closed';
export interface ChatConnection {
  close(): void;
  retry(): void;
  revoke(id: string): boolean;
}
export interface ChatRealtimePort {
  connect(
    onEvent: (event: ChatEvent) => void,
    onState: (state: ChatConnectionState) => void,
  ): ChatConnection;
}

export interface ChatPreferencesPort {
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
  content: string;
  quotedMessageId?: string | undefined;
  clientMessageId: string;
}
export interface ChatSendPort {
  send(input: SendMessageInput, signal: AbortSignal): Promise<ReceivedMessage>;
}
