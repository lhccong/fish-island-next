import type {
  AdminUser,
  AdminTitle,
  AdminTag,
  AdminWord,
  AdminEquipment,
  AdminReport,
} from '@/domain/admin';
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('管理服务返回格式异常，请重试');
  return value as Record<string, unknown>;
}
export const text = (v: unknown) =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '';
export function number(v: unknown) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) throw new Error('管理服务返回数值异常');
  return n;
}
function id(v: unknown) {
  const s = text(v);
  if (!s) throw new Error('管理记录缺少 ID');
  return s;
}
export function user(v: unknown): AdminUser {
  const r = record(v);
  return {
    id: id(r.id),
    account: text(r.userAccount),
    name: text(r.userName),
    avatar: text(r.userAvatar),
    profile: text(r.userProfile),
    role: text(r.userRole),
    createdAt: text(r.createTime),
    updatedAt: text(r.updateTime),
  };
}
export function title(v: unknown): AdminTitle {
  const r = record(v);
  return {
    id: id(r.titleId),
    name: text(r.name),
    createdAt: text(r.createTime),
    updatedAt: text(r.updateTime),
  };
}
export function tag(v: unknown): AdminTag {
  const r = record(v);
  return {
    id: id(r.id),
    name: text(r.tagsName),
    color: text(r.color),
    icon: text(r.icon),
    type: number(r.type),
    sort: number(r.sort),
  };
}
export function word(v: unknown): AdminWord {
  const r = record(v);
  return {
    id: id(r.id),
    word: text(r.word),
    category: text(r.category),
    wordType: text(r.wordType),
    createdAt: text(r.createTime),
    updatedAt: text(r.updateTime),
  };
}
function attributes(value: unknown): Record<string, number> {
  if (!value) return {};
  const r: unknown = typeof value === 'string' ? JSON.parse(value) : value;
  if (Array.isArray(r))
    return Object.fromEntries(
      r.map((v: unknown) => {
        const a = record(v);
        return [text(a.k), number(a.v)];
      }),
    );
  return Object.fromEntries(Object.entries(record(r)).map(([k, v]) => [k, number(v)]));
}
export function equipment(v: unknown): AdminEquipment {
  const r = record(v);
  return {
    id: id(r.id),
    name: text(r.name),
    code: text(r.code),
    category: text(r.category),
    subType: text(r.subType),
    equipSlot: text(r.equipSlot),
    icon: text(r.icon),
    rarity: number(r.rarity),
    levelReq: number(r.levelReq),
    baseAttack: number(r.baseAttack),
    baseDefense: number(r.baseDefense),
    baseHp: number(r.baseHp),
    baseSpeed: number(r.baseSpeed),
    stackable: number(r.stackable),
    removePoint: number(r.removePoint),
    description: text(r.description),
    attributes: attributes(r.mainAttr),
  };
}
export function report(v: unknown): AdminReport {
  const r = record(v);
  const reporter = r.reporterUser ? record(r.reporterUser) : {};
  const target = r.targetUser ? record(r.targetUser) : {};
  const chat = r.chatMessage ? record(r.chatMessage) : {};
  const wrapper = chat.messageWrapper ? record(chat.messageWrapper) : {};
  const message = wrapper.message ? record(wrapper.message) : {};
  return {
    id: id(r.id),
    type: number(r.reportType),
    typeText: text(r.reportTypeText),
    reason: text(r.reasonTypeText) || text(r.reasonType),
    reporterId: text(r.reporterId),
    reporterName: text(reporter.userName),
    targetUserId: text(target.id ?? r.targetUserId),
    targetUserName: text(target.userName),
    targetId: text(r.targetId),
    description: text(r.description),
    content: text(message.content),
    status: number(r.status),
    remark: text(r.handleRemark),
    createdAt: text(r.createTime),
    handledAt: text(r.handleTime),
  };
}
