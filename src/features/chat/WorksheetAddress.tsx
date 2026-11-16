import { useStore } from 'zustand';
import { useChatRealtime } from './realtime-context';
import styles from './ChatWorkspace.module.css';

export function WorksheetAddress() {
  const { controller } = useChatRealtime();
  const count = useStore(controller.store, (state) => state.visibleIds.length);
  return (
    <span className={styles.cellAddress} aria-label="输入单元格">
      C{count + 1}
    </span>
  );
}
