import type { ReaderRepository } from '@/domain/reader';
import { defaultReaderSettings } from '@/domain/reader';
import { decodeBook, decodeSettings, record } from './decode';

export function createReaderRepository(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
): ReaderRepository {
  return {
    load() {
      const saved = storage.getItem('fish-island:reader:v1');
      if (saved) {
        const data = record(JSON.parse(saved));
        if (!Array.isArray(data.books)) throw new Error('书架数据损坏，原始数据已保留');
        return {
          books: data.books.map((book) => decodeBook(book)),
          settings: decodeSettings(data.settings),
        };
      }
      const oldBooks: unknown = JSON.parse(storage.getItem('fish-reader-books') || '[]');
      if (!Array.isArray(oldBooks)) throw new Error('旧书架格式错误，原始数据已保留');
      const rawSettings = record(JSON.parse(storage.getItem('fish-reader-settings') || '{}'));
      rawSettings.customThemes = JSON.parse(storage.getItem('fish-reader-user-themes') || '[]');
      const settings = decodeSettings(rawSettings);
      settings.floating = storage.getItem('fish-reader-floating-mode') !== 'false';
      settings.study = storage.getItem('fish-reader-study-mode') === 'true';
      settings.clickThrough = storage.getItem('fish-reader-click-through') !== 'false';
      return {
        books: oldBooks.map((book) => decodeBook(book)),
        settings: { ...defaultReaderSettings, ...settings },
      };
    },
    save(library) {
      storage.setItem('fish-island:reader:v1', JSON.stringify(library));
    },
  };
}
