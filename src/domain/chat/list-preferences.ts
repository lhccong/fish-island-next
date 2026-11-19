export interface ConversationListEdit {
  name: string;
  preview: string;
}

export interface ChatListAppearance {
  custom: boolean;
  groupPreview: string;
  entries: { id: string; name: string; preview: string }[];
  conversationOrder?: string[];
  conversationEdits?: Record<string, ConversationListEdit>;
}

export interface ChatListPreferencesPort {
  read(): ChatListAppearance;
  write(value: ChatListAppearance): void;
}

export function defaultChatListAppearance(): ChatListAppearance {
  return { custom: false, groupPreview: '项目进度已同步，请查看最新排期', entries: [] };
}

export function parseChatListAppearance(value: unknown): ChatListAppearance {
  if (!value || typeof value !== 'object') throw new Error('列表设置格式无效');
  const data = value as Record<string, unknown>;
  if (
    typeof data.custom !== 'boolean' ||
    typeof data.groupPreview !== 'string' ||
    data.groupPreview.length > 100 ||
    !Array.isArray(data.entries) ||
    data.entries.length > 50
  )
    throw new Error('列表设置格式无效');
  const ids = new Set<string>();
  const entries = data.entries.map((entry: unknown) => {
    if (!entry || typeof entry !== 'object') throw new Error('列表条目格式无效');
    const row = entry as Record<string, unknown>;
    if (
      typeof row.id !== 'string' ||
      !row.id ||
      ids.has(row.id) ||
      typeof row.name !== 'string' ||
      !row.name.trim() ||
      row.name.length > 30 ||
      typeof row.preview !== 'string' ||
      row.preview.length > 100
    )
      throw new Error('请填写条目名称（最多 30 字），摘要最多 100 字');
    ids.add(row.id);
    return { id: row.id, name: row.name.trim(), preview: row.preview.trim() };
  });
  const appearance: ChatListAppearance = {
    custom: data.custom,
    groupPreview: data.groupPreview.trim(),
    entries,
  };
  if (data.conversationOrder !== undefined) {
    if (
      !Array.isArray(data.conversationOrder) ||
      !data.conversationOrder.every(isConversationKey) ||
      new Set(data.conversationOrder).size !== data.conversationOrder.length
    )
      throw new Error('对话顺序格式无效');
    appearance.conversationOrder = data.conversationOrder;
  }
  if (data.conversationEdits !== undefined)
    appearance.conversationEdits = parseConversationEdits(data.conversationEdits);
  return appearance;
}

function isConversationKey(value: unknown): value is string {
  return typeof value === 'string' && /^(member|cover):.+$/.test(value);
}

function parseConversationEdits(value: unknown): Record<string, ConversationListEdit> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('对话文案格式无效');
  const edits: Record<string, ConversationListEdit> = {};
  for (const [key, edit] of Object.entries(value as Record<string, unknown>)) {
    if (!isConversationKey(key) || !edit || typeof edit !== 'object')
      throw new Error('对话文案格式无效');
    const { name, preview } = edit as Record<string, unknown>;
    if (
      typeof name !== 'string' ||
      name.length > 30 ||
      typeof preview !== 'string' ||
      preview.length > 100
    )
      throw new Error('显示名称最多 30 字，摘要最多 100 字');
    if (name.trim() || preview.trim()) edits[key] = { name: name.trim(), preview: preview.trim() };
  }
  return edits;
}
