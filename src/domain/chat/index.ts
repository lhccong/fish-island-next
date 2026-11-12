// 客户端领域模型；后端 DTO 必须在 infrastructure 映射后进入此边界。
export type MessageId = string;
export type ConversationId = string;

export interface ChatPreferencesPort {
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
  messages: readonly TextMessage[];
  nextCursor: string | null;
}

// 边界种子：仅描述未来纯文本阶段；更多消息类型与实时事件按实际协议扩展。
export interface ChatHistoryPort {
  loadHistory(input: {
    conversationId: ConversationId;
    cursor: string | null;
    limit: number;
    signal?: AbortSignal;
  }): Promise<MessagePage>;
}
