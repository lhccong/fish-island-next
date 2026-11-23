import {
  ArrowUpRight,
  ChevronDown,
  Lightbulb,
  Minus,
  PanelTop,
  Redo2,
  Save,
  SquareStack,
  Undo2,
  UserRoundPlus,
  X,
} from 'lucide-react';
import type { Ref } from 'react';
import { Button } from '@/shared/ui/Button';
import { ReaderWordRibbon } from './ReaderWordRibbon';
import styles from './ReaderWordHeader.module.css';

export function ReaderWordHeader({
  exitRef,
  onExit,
}: {
  exitRef: Ref<HTMLButtonElement>;
  onExit: () => void;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.titleBar}>
        <div className={styles.quickActions} aria-hidden="true">
          <Save size={16} />
          <Undo2 size={19} className={styles.dimmed} />
          <Redo2 size={19} className={styles.dimmed} />
          <ChevronDown size={10} />
        </div>
        <div className={styles.title}>新建 Word 文档 - Word</div>
        <div className={styles.windowIcons} aria-hidden="true">
          <PanelTop size={14} />
          <Minus size={14} />
          <SquareStack size={14} />
          <X size={17} />
        </div>
      </div>
      <div className={styles.tabs} aria-hidden="true">
        <span>文件</span>
        <span className={styles.activeTab}>开始</span>
        <span>插入</span>
        <span className={styles.desktopTab}>设计</span>
        <span>布局</span>
        <span className={styles.desktopTab}>引用</span>
        <span className={styles.desktopTab}>邮件</span>
        <span>审阅</span>
        <span>视图</span>
        <span className={styles.searchHint}>
          <Lightbulb size={16} />
          告诉我您想要做什么…
        </span>
        <span className={styles.share}>
          <UserRoundPlus size={16} />
          共享
        </span>
      </div>
      <div className={styles.ribbon}>
        <ReaderWordRibbon />
        <div className={styles.exitGroup}>
          <Button ref={exitRef} className={styles.exit} variant="secondary" onClick={onExit}>
            <span className={styles.exitIcon} aria-hidden="true">
              <ArrowUpRight size={14} />
            </span>
            退出Word模式
          </Button>
        </div>
      </div>
    </header>
  );
}
