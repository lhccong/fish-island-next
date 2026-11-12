import {
  defaultReaderSettings,
  normalizeReaderColor,
  type Book,
  type Chapter,
  type ReaderSettings,
} from '@/domain/reader';

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('阅读服务返回格式错误');
  return value as Record<string, unknown>;
}
export const string = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback;
export function safeUrl(value: unknown): string {
  const raw = string(value);
  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}
export function decodeChapters(value: unknown): Chapter[] {
  if (!Array.isArray(value)) throw new Error('目录格式错误');
  const seen = new Set<number>();
  return value.map((item, order) => {
    const row = record(item);
    const index = typeof row.index === 'number' && Number.isInteger(row.index) ? row.index : order;
    if (seen.has(index)) throw new Error('目录包含重复章节');
    seen.add(index);
    return {
      index,
      title: string(row.title, `第${order + 1}章`),
      url: string(row.url),
      isVolume: row.isVolume === true,
      ...(typeof row.content === 'string' ? { content: row.content } : {}),
    };
  });
}
export function decodeBook(value: unknown, online = false): Book {
  const row = record(value);
  const sourceInfo =
    row.sourceInfo && typeof row.sourceInfo === 'object' ? record(row.sourceInfo) : {};
  const url = string(online ? row.bookUrl : row.url);
  const source = online || row.source === 'online' ? 'online' : 'local';
  const title = string(online ? row.name : row.title);
  if (!title || (source === 'online' && !url)) throw new Error('书籍信息不完整');
  return {
    id: online ? `${string(row.origin)}::${url}` : String(row.id ?? url),
    title,
    author: string(row.author) || '未知作者',
    cover: safeUrl(online ? row.coverUrl : row.cover),
    url,
    source,
    sourceInfo: {
      name:
        string(online ? row.originName : sourceInfo.name) ||
        string(online ? row.origin : sourceInfo.url) ||
        '未知来源',
      url: string(online ? row.origin : sourceInfo.url),
    },
    intro: string(row.intro),
    category: string(online ? row.kind : row.category).split(',')[0] ?? '',
    wordCount: typeof row.wordCount === 'number' ? String(row.wordCount) : string(row.wordCount),
    latestChapterTitle: string(row.latestChapterTitle),
    chapters: Array.isArray(row.chapters) ? decodeChapters(row.chapters) : [],
    lastReadChapter: typeof row.lastReadChapter === 'number' ? row.lastReadChapter : 0,
    lastReadPosition:
      typeof row.lastReadPosition === 'number' ? Math.max(0, row.lastReadPosition) : 0,
    lastReadTime: typeof row.lastReadTime === 'number' ? row.lastReadTime : 0,
  };
}
export function decodeSettings(value: unknown): ReaderSettings {
  const row = record(value);
  const settings = { ...defaultReaderSettings };
  for (const key of Object.keys(settings) as (keyof ReaderSettings)[]) {
    if (key === 'customThemes') continue;
    if (typeof row[key] === typeof settings[key]) Object.assign(settings, { [key]: row[key] });
  }
  const ranges = {
    fontSize: [12, 40],
    lineHeight: [1.2, 3],
    letterSpacing: [0, 8],
    paragraphIndent: [0, 4],
    opacity: [0.2, 1],
    speechRate: [0.5, 3],
    speechPitch: [0, 2],
    speechVolume: [0, 1],
  } as const;
  for (const key of Object.keys(ranges) as (keyof typeof ranges)[]) {
    const [min, max] = ranges[key];
    settings[key] = Number.isFinite(settings[key])
      ? Math.max(min, Math.min(max, settings[key]))
      : defaultReaderSettings[key];
  }
  if (!['none', 'key', 'mouseOut'].includes(settings.quickHide)) settings.quickHide = 'none';
  settings.apiBaseUrl = safeUrl(settings.apiBaseUrl) || defaultReaderSettings.apiBaseUrl;
  const serviceUrl = new URL(settings.apiBaseUrl);
  serviceUrl.username = '';
  serviceUrl.password = '';
  serviceUrl.search = '';
  serviceUrl.hash = '';
  settings.apiBaseUrl = serviceUrl.href.replace(/\/$/, '');
  if (Array.isArray(row.customThemes))
    settings.customThemes = row.customThemes.slice(0, 30).map((item) => {
      const theme = record(item);
      const fontColor = normalizeReaderColor(theme.fontColor ?? theme.color);
      const backgroundColor = normalizeReaderColor(theme.backgroundColor);
      if (!fontColor || !backgroundColor) throw new Error('自定义阅读主题格式错误');
      return {
        id: string(theme.id),
        name: string(theme.name),
        backgroundColor,
        fontColor,
        ...(typeof theme.fontSize === 'number'
          ? { fontSize: Math.max(12, Math.min(40, theme.fontSize)) }
          : {}),
        ...(typeof theme.fontFamily === 'string' ? { fontFamily: theme.fontFamily } : {}),
        ...(typeof theme.lineHeight === 'number'
          ? { lineHeight: Math.max(1.2, Math.min(3, theme.lineHeight)) }
          : {}),
        ...(typeof theme.letterSpacing === 'number'
          ? { letterSpacing: Math.max(0, Math.min(8, theme.letterSpacing)) }
          : {}),
      };
    });
  const legacyPaper = normalizeReaderColor(row.backgroundColor);
  const legacyInk = normalizeReaderColor(row.fontColor);
  if (!row.theme && legacyPaper && legacyInk) {
    settings.customThemes = [
      ...settings.customThemes,
      {
        id: 'legacy-custom',
        name: '旧版阅读配色',
        backgroundColor: legacyPaper,
        fontColor: legacyInk,
      },
    ];
    settings.theme = 'legacy-custom';
  }
  return settings;
}
