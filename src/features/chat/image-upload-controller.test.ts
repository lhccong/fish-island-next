import { describe, expect, it, vi } from 'vitest';
import { createImageUploadController } from './image-upload-controller';

const image = () => new File(['synthetic'], 'paste.png', { type: 'image/png' });
const prepare = async (file: File) => file;
describe('chat image upload lifecycle', () => {
  it('keeps one image, supports explicit retry and consumes a ready attachment', async () => {
    const upload = vi
      .fn()
      .mockRejectedValueOnce(new Error('上传失败'))
      .mockResolvedValue('https://image.test/a.png');
    const controller = createImageUploadController({ upload }, 'synthetic-owner', prepare);
    expect(controller.paste(image())).toBe(true);
    expect(controller.paste(image())).toBe(false);
    await vi.waitFor(() => expect(controller.store.getState().status).toBe('error'));
    controller.retry();
    await vi.waitFor(() =>
      expect(controller.store.getState()).toEqual({
        status: 'ready',
        url: 'https://image.test/a.png',
      }),
    );
    expect(upload).toHaveBeenCalledTimes(2);
    controller.clear();
    expect(controller.store.getState()).toEqual({ status: 'empty' });
  });
  it('aborts removal and ignores late responses without replacing the next upload', async () => {
    let complete!: (url: string) => void;
    const upload = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            complete = resolve;
          }),
      )
      .mockResolvedValue('https://image.test/new.png');
    const controller = createImageUploadController({ upload }, 'synthetic-owner', prepare);
    controller.paste(image());
    await vi.waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    const signal = upload.mock.calls[0]![1] as AbortSignal;
    controller.clear();
    expect(signal.aborted).toBe(true);
    controller.paste(image());
    await vi.waitFor(() => expect(controller.store.getState().status).toBe('ready'));
    complete('https://image.test/old.png');
    await Promise.resolve();
    expect(controller.store.getState()).toEqual({
      status: 'ready',
      url: 'https://image.test/new.png',
    });
    controller.dispose();
    expect(controller.paste(image())).toBe(false);
    expect(controller.store.getState()).toEqual({ status: 'empty' });
  });
  it('does not upload after disposal during image preparation', async () => {
    let complete!: (file: File) => void;
    const upload = vi.fn();
    const controller = createImageUploadController(
      { upload },
      'synthetic-owner',
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    controller.paste(image());
    controller.dispose();
    complete(image());
    await Promise.resolve();
    expect(upload).not.toHaveBeenCalled();
  });
});
