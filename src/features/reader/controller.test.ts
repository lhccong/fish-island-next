import { describe, expect, it, vi } from 'vitest';
import {
  defaultReaderSettings,
  importTextBook,
  type Book,
  type ReaderRepository,
  type ReaderService,
} from '@/domain/reader';
import { createReaderController } from './controller';
const local = () =>
  importTextBook('测试.txt', '第一章 开始\n测试正文\n第二章 继续\n更多正文', crypto.randomUUID());
function setup(books: Book[] = [local()]) {
  const repository: ReaderRepository = {
    load: () => ({ books, settings: defaultReaderSettings }),
    save: vi.fn(),
  };
  const service: ReaderService = { search: vi.fn(), chapters: vi.fn(), content: vi.fn() };
  const controller = createReaderController(service, repository);
  controller.getState().initialize();
  return { controller, service, repository };
}
describe('reader controller', () => {
  it('injects the configured token, supports session overrides and restores the default when cleared', async () => {
    const book = {
      ...local(),
      source: 'online' as const,
      url: 'https://books.test/configured',
      chapters: [],
    };
    const { service, repository } = setup([book]);
    vi.mocked(service.chapters).mockResolvedValue([
      { index: 0, title: '测试章节', url: '', isVolume: false },
    ]);
    vi.mocked(service.content).mockResolvedValue('合成正文');
    const controller = createReaderController(service, repository, 'synthetic-default');
    controller.getState().initialize();
    await controller.getState().open(book.id);
    expect(vi.mocked(service.chapters).mock.calls[0]![0].accessToken).toBe('synthetic-default');
    expect(vi.mocked(service.content).mock.calls[0]![0].accessToken).toBe('synthetic-default');
    controller.getState().setAccessToken('synthetic-override');
    expect(controller.getState().accessToken).toBe('synthetic-override');
    controller.getState().setAccessToken('');
    expect(controller.getState().accessToken).toBe('synthetic-default');
    expect(JSON.stringify(vi.mocked(repository.save).mock.calls)).not.toContain(
      'synthetic-default',
    );
  });
  it('imports text, navigates real chapters, persists zero progress and deduplicates', async () => {
    const { controller, repository } = setup();
    const state = controller.getState();
    const book = state.books[0]!;
    expect(book.chapters).toHaveLength(2);
    state.addBook(book);
    expect(controller.getState().books).toHaveLength(1);
    await state.open(book.id);
    state.progress(120);
    state.progress(0);
    await state.jump(1);
    expect(controller.getState().books[0]!.lastReadChapter).toBe(1);
    expect(controller.getState().books[0]!.lastReadPosition).toBe(0);
    expect(repository.save).toHaveBeenCalled();
    expect(() => importTextBook('empty.txt', '', 'empty')).toThrow();
  });
  it('discards stale responses after switching books and closing', async () => {
    const first = {
      ...local(),
      source: 'online' as const,
      url: 'https://books.test/a',
      chapters: [],
    };
    const second = local();
    const { controller, service } = setup([first, second]);
    let finish!: (value: []) => void;
    vi.mocked(service.chapters).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const pending = controller.getState().open(first.id);
    await controller.getState().open(second.id);
    finish([]);
    await pending;
    expect(controller.getState().activeId).toBe(second.id);
    expect(controller.getState().status).toBe('ready');
    const next = controller.getState().open(first.id);
    controller.getState().close();
    finish([]);
    await next;
    expect(controller.getState().activeId).toBeNull();
    expect(controller.getState().status).toBe('idle');
  });
  it('reports request and persistence failures and preserves corrupt storage', async () => {
    const book = {
      ...local(),
      source: 'online' as const,
      url: 'https://books.test/a',
      chapters: [],
    };
    const { controller, service, repository } = setup([book]);
    vi.mocked(service.chapters).mockRejectedValue(new Error('请求失败'));
    await controller.getState().open(book.id);
    expect(controller.getState().error).toBe('请求失败');
    vi.mocked(repository.save).mockImplementation(() => {
      throw new Error('quota');
    });
    controller.getState().progress(20);
    expect(controller.getState().storageError).toContain('本地存储失败');
    const broken = {
      load: () => {
        throw new Error('corrupt');
      },
      save: vi.fn(),
    };
    const isolated = createReaderController(service, broken);
    isolated.getState().initialize();
    isolated.getState().addBook(local());
    expect(broken.save).not.toHaveBeenCalled();
  });
  it('does not overwrite other chapter progress with delayed scroll saves', async () => {
    const { controller } = setup();
    const state = controller.getState();
    const book = state.books[0]!;
    await state.open(book.id);
    await state.jump(1);
    state.progress(45, book.id, 1);
    state.progress(900, book.id, 0);
    expect(controller.getState().books[0]!.lastReadPosition).toBe(45);
  });
});
