import type { AdminSection } from '@/domain/admin';
export const adminSections: readonly { id: AdminSection; label: string; path: string }[] = [
  { id: 'broadcast', label: '全体播报', path: '/admin/broadcast' },
  { id: 'big-fish', label: '大肥鱼', path: '/admin/big-fish' },
  { id: 'data', label: '数据分析', path: '/admin/data' },
  { id: 'user', label: '用户管理', path: '/admin/user' },
  { id: 'title', label: '称号管理', path: '/admin/title' },
  { id: 'tags', label: '标签管理', path: '/admin/tags' },
  { id: 'word', label: '词库管理', path: '/admin/word/library' },
  { id: 'equipment', label: '装备管理', path: '/admin/game/itemTemplates' },
  { id: 'pet-cards', label: '卡池配置', path: '/admin/pet-cards' },
  { id: 'report', label: '举报管理', path: '/admin/report' },
];
