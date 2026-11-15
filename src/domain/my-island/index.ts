export type IslandModule = 'tasks' | 'note' | 'dock';
export type IslandDecoration = 'cabin' | 'palms' | 'harbor';
export interface IslandTask {
  id: string;
  text: string;
  done: boolean;
}
export interface IslandShortcut {
  id: string;
  label: string;
  href: string;
}
export interface IslandData {
  name: string;
  motto: string;
  decoration: IslandDecoration;
  tasks: IslandTask[];
  note: string;
  shortcuts: IslandShortcut[];
  modules: { id: IslandModule; visible: boolean }[];
}
export interface IslandPreferencesPort {
  read(accountId: string): IslandData;
  write(accountId: string, data: IslandData): void;
}
export function defaultIsland(): IslandData {
  return {
    name: '我的小岛',
    motto: '今天也慢慢来',
    decoration: 'cabin',
    tasks: [],
    note: '',
    shortcuts: [
      { id: 'farm', label: '农场', href: '/game/farm' },
      { id: 'pet', label: '伙伴', href: '/pet' },
    ],
    modules: [
      { id: 'tasks', visible: true },
      { id: 'note', visible: true },
      { id: 'dock', visible: true },
    ],
  };
}
export function safeIslandHref(href: string): boolean {
  if (!href || /[\s\\]/.test(href) || [...href].some((char) => char.charCodeAt(0) < 32))
    return false;
  if (href.startsWith('/')) return !href.startsWith('//');
  try {
    return ['https:', 'http:'].includes(new URL(href).protocol);
  } catch {
    return false;
  }
}
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length <= max;
export function isIslandData(value: unknown): value is IslandData {
  if (
    !object(value) ||
    !text(value.name, 24) ||
    !value.name.trim() ||
    !text(value.motto, 60) ||
    !text(value.note, 5000)
  )
    return false;
  if (!['cabin', 'palms', 'harbor'].includes(String(value.decoration))) return false;
  if (
    !Array.isArray(value.tasks) ||
    value.tasks.length > 100 ||
    !value.tasks.every(
      (t) =>
        object(t) &&
        text(t.id, 100) &&
        text(t.text, 120) &&
        !!t.text.trim() &&
        typeof t.done === 'boolean',
    )
  )
    return false;
  if (
    !Array.isArray(value.shortcuts) ||
    value.shortcuts.length > 12 ||
    !value.shortcuts.every(
      (s) =>
        object(s) &&
        text(s.id, 100) &&
        text(s.label, 20) &&
        !!s.label.trim() &&
        text(s.href, 2048) &&
        safeIslandHref(s.href),
    )
  )
    return false;
  if (
    !Array.isArray(value.modules) ||
    value.modules.length !== 3 ||
    !value.modules.every(
      (m) =>
        object(m) &&
        ['tasks', 'note', 'dock'].includes(String(m.id)) &&
        typeof m.visible === 'boolean',
    )
  )
    return false;
  return (
    new Set(value.modules.map((m) => m.id)).size === 3 &&
    new Set(value.tasks.map((t) => t.id)).size === value.tasks.length &&
    new Set(value.shortcuts.map((s) => s.id)).size === value.shortcuts.length
  );
}
