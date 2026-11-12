import { createStore, type StoreApi } from 'zustand/vanilla';
import {
  defaultReaderSettings,
  type Book,
  type Chapter,
  type ReaderRepository,
  type ReaderService,
  type ReaderSettings,
} from '@/domain/reader';

export interface ReaderState {
  books: Book[];
  settings: ReaderSettings;
  initialized: boolean;
  storageError: string;
  activeId: string | null;
  hidden: boolean;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string;
  accessToken: string;
  launch: { version: number; contents: boolean };
  initialize: () => void;
  addBook: (book: Book) => void;
  deleteBook: (id: string) => void;
  open: (id: string, chapter?: number, contents?: boolean) => Promise<void>;
  jump: (index: number, refresh?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
  progress: (position: number, bookId?: string, chapterIndex?: number) => void;
  configure: (settings: ReaderSettings) => void;
  setAccessToken: (token: string) => void;
  hide: () => void;
  resume: () => void;
  close: () => void;
}
export type ReaderController = StoreApi<ReaderState>;
export function createReaderController(
  service: ReaderService,
  repository: ReaderRepository,
  defaultAccessToken = '',
): ReaderController {
  let pending: AbortController | null = null;
  let generation = 0;
  let storageReadable = true;
  let lastRequest: { id: string; index: number | undefined; refresh: boolean } | null = null;
  return createStore<ReaderState>((set, get) => {
    const save = () => {
      if (!storageReadable) return;
      try {
        repository.save({ books: get().books, settings: get().settings });
        set({ storageError: '' });
      } catch {
        set({ storageError: '本地存储失败，本次更改仅保留在内存中，请释放存储空间后重试。' });
      }
    };
    const updateBook = (id: string, update: (book: Book) => Book) => {
      set({ books: get().books.map((book) => (book.id === id ? update(book) : book)) });
      save();
    };
    const connection = () => ({
      baseUrl: get().settings.apiBaseUrl,
      accessToken: get().accessToken,
    });
    const load = async (id: string, index: number | undefined, refresh: boolean) => {
      lastRequest = { id, index, refresh };
      pending?.abort();
      const abort = new AbortController();
      pending = abort;
      const version = ++generation;
      set({ status: 'loading', error: '' });
      try {
        let book = get().books.find((item) => item.id === id);
        if (!book) throw new Error('书籍已被移除');
        if (book.source === 'online' && (!book.chapters.length || refresh)) {
          const chapters = await service.chapters(connection(), book, refresh, abort.signal);
          if (version !== generation) return;
          book = { ...book, chapters };
        }
        let chapter =
          book.chapters.find(
            (item) => item.index === (index ?? book.lastReadChapter) && !item.isVolume,
          ) ?? book.chapters.find((item) => !item.isVolume);
        if (chapter && book.source === 'online' && (!chapter.content || refresh)) {
          chapter = {
            ...chapter,
            content: await service.content(connection(), book, chapter, abort.signal),
          };
        }
        if (version !== generation || abort.signal.aborted) return;
        const loaded: Chapter | undefined = chapter;
        const sameChapter = book.lastReadChapter === loaded?.index;
        const updated = {
          ...book,
          chapters: book.chapters.map((item) => (item.index === loaded?.index ? loaded : item)),
          lastReadChapter: loaded?.index ?? 0,
          lastReadPosition:
            sameChapter && !refresh
              ? (get().books.find((item) => item.id === id)?.lastReadPosition ?? 0)
              : 0,
          lastReadTime: Date.now(),
        };
        updateBook(id, () => updated);
        set({ status: 'ready' });
      } catch (error) {
        if (abort.signal.aborted || version !== generation) return;
        set({
          status: 'error',
          error: error instanceof Error ? error.message : '加载失败，请重试',
        });
      }
    };
    return {
      books: [],
      settings: defaultReaderSettings,
      initialized: false,
      storageError: '',
      activeId: null,
      hidden: false,
      status: 'idle',
      error: '',
      accessToken: defaultAccessToken,
      launch: { version: 0, contents: false },
      initialize() {
        if (get().initialized) return;
        try {
          set({ ...repository.load(), initialized: true });
        } catch {
          storageReadable = false;
          set({
            initialized: true,
            storageError: '无法读取本地书架，原数据已保留。请检查浏览器存储后刷新重试。',
          });
        }
      },
      addBook(book) {
        if (
          get().books.some(
            (item) =>
              item.id === book.id ||
              (book.url && item.url === book.url && item.sourceInfo.url === book.sourceInfo.url),
          )
        )
          return;
        set({ books: [...get().books, book] });
        save();
      },
      deleteBook(id) {
        if (get().activeId === id) get().close();
        set({ books: get().books.filter((book) => book.id !== id) });
        save();
      },
      async open(id, chapter, contents = false) {
        set({
          activeId: id,
          hidden: false,
          launch: { version: get().launch.version + 1, contents },
        });
        await load(id, chapter, false);
      },
      async jump(index, refresh = false) {
        const id = get().activeId;
        if (id) await load(id, index, refresh);
      },
      async refresh() {
        const id = get().activeId;
        if (id) await load(id, undefined, true);
      },
      async retry() {
        const request = lastRequest;
        if (request && request.id === get().activeId)
          await load(request.id, request.index, request.refresh);
      },
      progress(position, bookId, chapterIndex) {
        const id = bookId ?? get().activeId;
        if (id && Number.isFinite(position))
          updateBook(id, (book) =>
            chapterIndex !== undefined && book.lastReadChapter !== chapterIndex
              ? book
              : { ...book, lastReadPosition: Math.max(0, position), lastReadTime: Date.now() },
          );
      },
      configure(settings) {
        set({ settings });
        save();
      },
      setAccessToken(accessToken) {
        set({ accessToken: accessToken.trim() || defaultAccessToken });
      },
      hide() {
        set({ hidden: true });
      },
      resume() {
        set({ hidden: false, launch: { ...get().launch, contents: false } });
      },
      close() {
        lastRequest = null;
        pending?.abort();
        ++generation;
        set({ activeId: null, hidden: false, status: 'idle' });
      },
    };
  });
}
