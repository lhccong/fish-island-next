import type { Tool } from '@/app/config/tools';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { useToolSlot } from './tool-windows-context';
import styles from './GameWindows.module.css';

export function ToolWindowPane({ tool, hidden }: { tool: Tool; hidden: boolean }) {
  const register = useToolSlot(tool.path, 'window');
  return (
    <div hidden={hidden} className={styles.pane}>
      <ScrollArea
        className={styles.toolScroll ?? ''}
        label={`${tool.label}窗口内容`}
        gutter="reserved"
        persistentScrollbar
      >
        <div className={styles.toolSlot} ref={register} />
      </ScrollArea>
    </div>
  );
}
