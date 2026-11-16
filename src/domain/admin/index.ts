export type AdminSection =
  'data' | 'user' | 'title' | 'tags' | 'word' | 'equipment' | 'report' | 'broadcast';
export type AdminCollection = Exclude<AdminSection, 'data' | 'broadcast'>;
export function isAssignableTitle(id: string): boolean {
  return /^[1-9]\d*$/.test(id) && !(Number(id) >= 2 && Number(id) <= 10);
}
export interface AdminUser {
  id: string;
  account: string;
  name: string;
  avatar: string;
  profile: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}
export interface AdminTitle {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
export interface AdminTag {
  id: string;
  name: string;
  color: string;
  icon: string;
  type: number;
  sort: number;
}
export interface AdminWord {
  id: string;
  word: string;
  category: string;
  wordType: string;
  createdAt: string;
  updatedAt: string;
}
export interface AdminEquipment {
  id: string;
  name: string;
  code: string;
  category: string;
  subType: string;
  equipSlot: string;
  icon: string;
  rarity: number;
  levelReq: number;
  baseAttack: number;
  baseDefense: number;
  baseHp: number;
  baseSpeed: number;
  stackable: number;
  removePoint: number;
  description: string;
  attributes: Record<string, number>;
}
export interface AdminReport {
  id: string;
  type: number;
  typeText: string;
  reason: string;
  reporterId: string;
  reporterName: string;
  targetUserId: string;
  targetUserName: string;
  targetId: string;
  description: string;
  content: string;
  status: number;
  remark: string;
  createdAt: string;
  handledAt: string;
}
export interface AdminEntities {
  user: AdminUser;
  title: AdminTitle;
  tags: AdminTag;
  word: AdminWord;
  equipment: AdminEquipment;
  report: AdminReport;
}
export type AdminEntry = AdminEntities[AdminCollection];
export type AdminFilter = Record<string, string | number | string[]>;
export interface AdminPage<T> {
  items: T[];
  total: number;
}
export interface AdminStatistics {
  totalUsers: number;
  todayNewUsers: number;
  todayActiveUsers: number;
  thisMonthActiveUsers: number;
}
export interface AdminTrend {
  date: string;
  count: number;
}
export interface AdminPort {
  publishBroadcast(content: string, signal: AbortSignal): Promise<void>;
  list<K extends AdminCollection>(
    section: K,
    page: number,
    filter: AdminFilter,
    signal: AbortSignal,
  ): Promise<AdminPage<AdminEntities[K]>>;
  saveUser(value: Omit<AdminUser, 'createdAt' | 'updatedAt'>, signal: AbortSignal): Promise<void>;
  saveTitle(value: Pick<AdminTitle, 'id' | 'name'>, signal: AbortSignal): Promise<void>;
  saveTag(value: AdminTag, signal: AbortSignal): Promise<void>;
  saveWord(value: Omit<AdminWord, 'createdAt' | 'updatedAt'>, signal: AbortSignal): Promise<void>;
  saveEquipment(value: AdminEquipment, signal: AbortSignal): Promise<void>;
  remove(
    section: Exclude<AdminCollection, 'report'>,
    id: string,
    signal: AbortSignal,
  ): Promise<void>;
  userTitles(userId: string, signal: AbortSignal): Promise<AdminTitle[]>;
  assignTitle(userId: string, titleId: string, assign: boolean, signal: AbortSignal): Promise<void>;
  markScript(userId: string, marked: boolean, signal: AbortSignal): Promise<void>;
  handleReport(id: string, status: number, remark: string, signal: AbortSignal): Promise<void>;
  muteUser(userId: string, duration: number, signal: AbortSignal): Promise<void>;
  statistics(signal: AbortSignal): Promise<AdminStatistics>;
  trend(type: number, begin: string, end: string, signal: AbortSignal): Promise<AdminTrend[]>;
}
