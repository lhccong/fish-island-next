import { createStore } from 'zustand/vanilla';
import type { ChatImageUploadPort } from '@/domain/chat';
import { prepareChatImage } from './prepare-image';

type ImageState =
  | { status: 'empty' }
  | { status: 'uploading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; url: string };

export function createImageUploadController(
  port: ChatImageUploadPort,
  ownerId: string,
  prepare = prepareChatImage,
) {
  const store = createStore<ImageState>(() => ({ status: 'empty' }));
  let pending: AbortController | null = null;
  let file: File | null = null;
  let active = true;
  const clear = () => {
    pending?.abort();
    pending = null;
    file = null;
    store.setState({ status: 'empty' }, true);
  };
  const upload = async () => {
    if (!active || !file || pending) return;
    const request = new AbortController();
    pending = request;
    store.setState({ status: 'uploading' }, true);
    try {
      const prepared = await prepare(file, request.signal);
      request.signal.throwIfAborted();
      const url = await port.upload(prepared, request.signal);
      if (active && pending === request) {
        file = null;
        store.setState({ status: 'ready', url }, true);
      }
    } catch (error) {
      if (active && pending === request && !request.signal.aborted)
        store.setState(
          {
            status: 'error',
            error: error instanceof Error ? error.message : '图片上传失败，请重试',
          },
          true,
        );
    } finally {
      if (pending === request) pending = null;
    }
  };
  return {
    ownerId,
    store,
    clear,
    start() {
      active = true;
    },
    paste(image: File) {
      if (!active || store.getState().status !== 'empty') return false;
      file = image;
      void upload();
      return true;
    },
    retry() {
      if (store.getState().status === 'error') void upload();
    },
    dispose() {
      active = false;
      clear();
    },
  };
}
export type ImageUploadController = ReturnType<typeof createImageUploadController>;
