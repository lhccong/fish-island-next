import type { AdminSection } from '@/domain/admin';
export const adminSections: readonly { id: AdminSection; label: string; path: string }[] = [
  { id: 'data', label: '数据分析', path: '/admin/data' },
  { id: 'user', label: '用户管理', path: '/admin/user' },
  { id: 'title', label: '称号管理', path: '/admin/title' },
  { id: 'tags', label: '标签管理', path: '/admin/tags' },
  { id: 'word', label: '词库管理', path: '/admin/word/library' },
  { id: 'equipment', label: '装备管理', path: '/admin/game/itemTemplates' },
  { id: 'report', label: '举报管理', path: '/admin/report' },
];
