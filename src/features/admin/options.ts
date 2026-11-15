export const roles = [
  { value: 'user', label: '普通用户' },
  { value: 'admin', label: '管理员' },
  { value: 'ban', label: '封禁用户' },
];
export const categories = [
  { value: 'undercover', label: '谁是卧底' },
  { value: 'draw-default', label: '你画我猜·默认' },
  { value: 'draw-hero', label: '你画我猜·王者荣耀' },
  { value: 'draw-idiom', label: '你画我猜·成语' },
];
export const itemCategories = [
  { value: 'equipment', label: '装备' },
  { value: 'consumable', label: '消耗品' },
  { value: 'material', label: '材料' },
];
export const slots = [
  { value: 'none', label: '无' },
  { value: 'weapon', label: '武器' },
  { value: 'head', label: '头盔' },
  { value: 'foot', label: '鞋子' },
  { value: 'hand', label: '手套' },
  { value: 'necklace', label: '项链' },
  { value: 'wing', label: '翅膀' },
];
export const rarities = ['普通', '优良', '精良', '史诗', '传说', '神话', '至尊', '神器'].map(
  (label, i) => ({ value: String(i + 1), label }),
);
export const reportStatuses = [
  { value: '0', label: '待处理' },
  { value: '1', label: '已处理' },
  { value: '2', label: '已驳回' },
];
export function labelOf(
  options: readonly { value: string; label: string }[],
  value: string | number,
) {
  return options.find((o) => o.value === String(value))?.label || String(value || '—');
}
