import { BookOpen } from 'lucide-react';
import type { ReaderController } from './controller';
import { useReader } from './use-reader';
import { ReaderSurface } from './ReaderSurface';
import styles from './Reader.module.css';

export function ReaderHost({
  controller,
  pageActive,
}: {
  controller: ReaderController;
  pageActive: boolean;
}) {
  const activeId = useReader(controller, (state) => state.activeId);
  const hidden = useReader(controller, (state) => state.hidden);
  const floating = useReader(controller, (state) => state.settings.floating);
  const launch = useReader(controller, (state) => state.launch.version);
  if (!activeId) return null;
  if (hidden || (!floating && !pageActive))
    return (
      <button
        className={styles.resume}
        aria-label="恢复阅读窗口"
        onClick={() => {
          controller.getState().configure({ ...controller.getState().settings, floating: true });
          controller.getState().resume();
        }}
      >
        <BookOpen size={18} />
        继续阅读
      </button>
    );
  return <ReaderSurface key={launch} controller={controller} />;
}
