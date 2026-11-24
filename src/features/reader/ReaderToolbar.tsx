import type { Ref } from 'react';
import { Button } from '@/shared/ui/Button';
import {
  List,
  Maximize2,
  Minimize2,
  PictureInPicture2,
  RefreshCw,
  Search,
  Settings,
  SquareDashed,
} from 'lucide-react';
import type { usePictureInPicture } from './use-picture-in-picture';
import styles from './Reader.module.css';

export function ReaderToolbar({
  wordEntryRef,
  findTrigger,
  findOpen,
  canFind,
  loading,
  clickThrough,
  pip,
  maximized,
  onEnterWord,
  onOpenDialog,
  onToggleFind,
  onRefresh,
  onToggleClickThrough,
  onToggleMaximized,
}: {
  wordEntryRef: Ref<HTMLButtonElement>;
  findTrigger: Ref<HTMLButtonElement>;
  findOpen: boolean;
  canFind: boolean;
  loading: boolean;
  clickThrough: boolean;
  pip: ReturnType<typeof usePictureInPicture>;
  maximized: boolean;
  onEnterWord: () => void;
  onOpenDialog: (value: 'settings' | 'contents') => void;
  onToggleFind: () => void;
  onRefresh: () => void;
  onToggleClickThrough: () => void;
  onToggleMaximized: () => void;
}) {
  return (
    <>
      {!pip.active && (
        <Button
          ref={wordEntryRef}
          className={styles.wordEntry}
          variant="secondary"
          onClick={onEnterWord}
        >
          Word模式
        </Button>
      )}
      <div className={styles.toolbar}>
        <button aria-label="章节目录" onClick={() => onOpenDialog('contents')}>
          <List size={18} />
        </button>
        <button
          ref={findTrigger}
          aria-label="搜索当前章节"
          aria-expanded={findOpen}
          disabled={!canFind}
          onClick={onToggleFind}
        >
          <Search size={18} />
        </button>
        <button aria-label="刷新阅读内容" disabled={loading} onClick={onRefresh}>
          <RefreshCw size={18} />
        </button>
        <button
          aria-label="背景点击穿透"
          aria-pressed={clickThrough}
          onClick={onToggleClickThrough}
        >
          <SquareDashed size={18} />
        </button>
        <button aria-label="阅读器设置" onClick={() => onOpenDialog('settings')}>
          <Settings size={18} />
        </button>
        <button
          aria-label={pip.active ? '退出画中画' : '画中画'}
          title={pip.supported ? '画中画' : '当前浏览器不支持文档画中画，点击查看说明'}
          onClick={() => void pip.toggle()}
        >
          <PictureInPicture2 size={18} />
        </button>
        <button
          className={styles.maximize}
          aria-label="切换全屏"
          aria-pressed={maximized}
          onClick={onToggleMaximized}
        >
          {maximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>
    </>
  );
}
