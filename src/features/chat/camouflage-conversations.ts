import type { OnlineMember } from '@/domain/chat';
import { getWorkPreview } from './work-preview';

export interface CoverConversation {
  kind: 'cover';
  id: string;
  name: string;
  preview: string;
  avatar: 'service' | 'subscription' | 'group' | 'notice';
}

export type ChatListEntry =
  CoverConversation | { kind: 'member'; id: string; name: string; member: OnlineMember };

export interface EditableConversation {
  key: string;
  defaultName: string;
  defaultPreview: string;
}

export type ConversationEditorRow = ChatListEntry & EditableConversation;

const covers: readonly { after: number; entry: CoverConversation }[] = [
  {
    after: 2,
    entry: {
      kind: 'cover',
      id: 'service',
      name: '服务号',
      preview: '行政通知：本月考勤、项目工时与报销材料请于周五下班前完成核对并提交',
      avatar: 'service',
    },
  },
  {
    after: 4,
    entry: {
      kind: 'cover',
      id: 'project',
      name: '项目协作群',
      preview: '产品：需求清单已更新，请查收',
      avatar: 'group',
    },
  },
  {
    after: 5,
    entry: {
      kind: 'cover',
      id: 'subscription',
      name: '公众号',
      preview: '职场周刊：本周项目协作与效率提升指南，附会议纪要模板及需求跟进清单',
      avatar: 'subscription',
    },
  },
  {
    after: 10,
    entry: {
      kind: 'cover',
      id: 'review',
      name: '技术评审群',
      preview: '研发：下午三点同步实现方案',
      avatar: 'group',
    },
  },
  {
    after: 16,
    entry: {
      kind: 'cover',
      id: 'notice',
      name: '服务通知',
      preview: '协作提醒：请更新本周任务状态',
      avatar: 'notice',
    },
  },
];

export function buildConversationEntries(
  members: readonly OnlineMember[],
): readonly ChatListEntry[] {
  if (members.length === 0) return [];
  const entries: ChatListEntry[] = [];
  let next = 0;
  members.forEach((member, index) => {
    entries.push({ kind: 'member', id: member.id, name: member.name, member });
    while (next < covers.length && covers[next]!.after <= index + 1)
      entries.push(covers[next++]!.entry);
  });
  while (next < covers.length) entries.push(covers[next++]!.entry);
  return entries;
}

export function describeConversation(entry: ChatListEntry, remark?: string): EditableConversation {
  return {
    key: `${entry.kind}:${entry.id}`,
    defaultName: remark || entry.name,
    defaultPreview: entry.kind === 'member' ? getWorkPreview(entry.id) : entry.preview,
  };
}

export function orderConversations<T extends EditableConversation>(
  entries: readonly T[],
  order: readonly string[] = [],
): readonly T[] {
  if (!order.length) return entries;
  const remaining = new Map(entries.map((entry) => [entry.key, entry]));
  const ordered: T[] = [];
  for (const key of order) {
    const entry = remaining.get(key);
    if (entry) {
      ordered.push(entry);
      remaining.delete(key);
    }
  }
  return [...ordered, ...remaining.values()];
}

export function moveListItem<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
  const reordered = [...items];
  const next = index + direction;
  if (index >= 0 && index < reordered.length && next >= 0 && next < reordered.length)
    [reordered[index], reordered[next]] = [reordered[next]!, reordered[index]!];
  return reordered;
}
