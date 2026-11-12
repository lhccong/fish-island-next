import { useEffect } from 'react';
import type { ReaderController } from './controller';
export function useReaderKeys(
  controller: ReaderController,
  owner: Window,
  dialogOpen: boolean,
  onHide: () => void,
  onChange: (offset: number) => void,
) {
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const settings = controller.getState().settings;
      const target = event.target as HTMLElement | null;
      if (
        event.isComposing ||
        target?.closest(
          'input,textarea,[contenteditable="true"],[role="dialog"],[role="listbox"],[role="menu"]',
        ) ||
        dialogOpen
      )
        return;
      if (event.code === settings.panicKey) {
        event.preventDefault();
        onHide();
      } else if (event.code === settings.prevPageKey) {
        event.preventDefault();
        onChange(-1);
      } else if (event.code === settings.nextPageKey) {
        event.preventDefault();
        onChange(1);
      } else if (event.ctrlKey && event.code === 'KeyT') {
        event.preventDefault();
        controller.getState().configure({ ...settings, clickThrough: !settings.clickThrough });
      }
    };
    owner.addEventListener('keydown', keydown);
    return () => owner.removeEventListener('keydown', keydown);
  }, [controller, owner, dialogOpen, onHide, onChange]);
}
