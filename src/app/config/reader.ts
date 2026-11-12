import { createReaderController } from '@/features/reader';
import { createReaderRepository, readerService } from '@/infrastructure/reader';
import { readerServiceConfig } from './reader-service';
export const readerController = createReaderController(
  readerService,
  createReaderRepository({
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
  }),
  readerServiceConfig.accessToken,
);
