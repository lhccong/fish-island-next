export interface ChatListAppearance {
  custom: boolean;
  groupPreview: string;
  entries: { id: string; name: string; preview: string }[];
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
  return { custom: data.custom, groupPreview: data.groupPreview.trim(), entries };
}
