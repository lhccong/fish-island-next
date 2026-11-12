export { normalizeReaderColor } from './colors';

export interface Chapter {
  index: number;
  title: string;
  url: string;
  isVolume: boolean;
  content?: string;
}
export interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  url: string;
  source: 'local' | 'online';
  sourceInfo: { name: string; url: string };
  intro: string;
  category?: string;
  wordCount?: string;
  latestChapterTitle?: string;
  chapters: Chapter[];
  lastReadChapter: number;
  lastReadPosition: number;
  lastReadTime: number;
}
export interface ReadingTheme {
  id: string;
  name: string;
  backgroundColor: string;
  fontColor: string;
  fontSize?: number;
  fontFamily?: string;
  lineHeight?: number;
  letterSpacing?: number;
}
export interface ReaderSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  letterSpacing: number;
  paragraphIndent: number;
  opacity: number;
  theme: string;
  customThemes: ReadingTheme[];
  floating: boolean;
  clickThrough: boolean;
  allowWindowMove: boolean;
  study: boolean;
  quickHide: 'none' | 'mouseOut' | 'key';
  panicKey: string;
  prevPageKey: string;
  nextPageKey: string;
  apiBaseUrl: string;
  ttsEnabled: boolean;
  speechRate: number;
  speechPitch: number;
  speechVolume: number;
  voice: string;
}
export const defaultReaderSettings: ReaderSettings = {
  fontSize: 18,
  fontFamily: 'system-ui',
  lineHeight: 1.8,
  letterSpacing: 0.5,
  paragraphIndent: 2,
  opacity: 1,
  theme: 'default',
  customThemes: [],
  floating: true,
  clickThrough: true,
  allowWindowMove: true,
  study: false,
  quickHide: 'none',
  panicKey: 'Escape',
  prevPageKey: 'ArrowLeft',
  nextPageKey: 'ArrowRight',
  apiBaseUrl: 'https://reader.yucoder.cn/reader3',
  ttsEnabled: false,
  speechRate: 1,
  speechPitch: 1,
  speechVolume: 1,
  voice: 'auto',
};
export interface ReaderConnection {
  baseUrl: string;
  accessToken: string;
}
export interface SearchPage {
  books: Book[];
  lastIndex: number;
  hasMore: boolean;
}
export interface ReaderService {
  search(
    connection: ReaderConnection,
    keyword: string,
    page: number,
    lastIndex: number,
    signal: AbortSignal,
    onBatch: (batch: SearchPage) => void,
  ): Promise<SearchPage>;
  chapters(
    connection: ReaderConnection,
    book: Book,
    refresh: boolean,
    signal: AbortSignal,
  ): Promise<Chapter[]>;
  content(
    connection: ReaderConnection,
    book: Book,
    chapter: Chapter,
    signal: AbortSignal,
  ): Promise<string>;
}
export interface ReaderLibrary {
  books: Book[];
  settings: ReaderSettings;
}
export interface ReaderRepository {
  load(): ReaderLibrary;
  save(library: ReaderLibrary): void;
}

export function importTextBook(filename: string, text: string, id: string): Book {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
  if (!normalized.trim()) throw new Error('文件没有可阅读的文字');
  const sections = normalized
    .split(/(?=^\s*第[零〇一二三四五六七八九十百千万两\d]+[章回节卷部篇].*$)/m)
    .filter((part) => part.trim());
  return {
    id,
    title: filename.replace(/\.txt$/i, ''),
    author: '本地导入',
    cover: '',
    url: '',
    source: 'local',
    sourceInfo: { name: 'TXT', url: '' },
    intro: '',
    chapters: sections.map((part, index) => ({
      index,
      title: sections.length === 1 ? '正文' : part.trim().split('\n')[0]!.slice(0, 100),
      url: '',
      isVolume: false,
      content: part.trim(),
    })),
    lastReadChapter: 0,
    lastReadPosition: 0,
    lastReadTime: 0,
  };
}
