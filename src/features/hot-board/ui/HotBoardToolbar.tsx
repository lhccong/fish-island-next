import { Grid2X2, Music, PlayCircle, Settings, Trophy, Zap } from 'lucide-react';
import type { HotSource } from '@/domain/hot-board';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import styles from './HotBoardToolbar.module.css';

interface HotBoardToolbarProps {
  sources: readonly HotSource[];
  categories: readonly string[];
  category: string;
  hiddenIds: readonly string[];
  onCategoryChange: (category: string) => void;
  onToggleSource: (id: string) => void;
  onReset: () => void;
}

function categoryIcon(name: string) {
  if (name.includes('音乐')) return Music;
  if (name.includes('体育')) return Trophy;
  if (name.includes('视频')) return PlayCircle;
  if (name.includes('综合')) return Zap;
  return Grid2X2;
}

export function HotBoardToolbar({
  sources,
  categories,
  category,
  hiddenIds,
  onCategoryChange,
  onToggleSource,
  onReset,
}: HotBoardToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.tabs} role="group" aria-label="热榜分类">
        <div className={styles.pills}>
          <button
            type="button"
            aria-pressed={category === 'all'}
            onClick={() => onCategoryChange('all')}
          >
            <Grid2X2 size={15} aria-hidden="true" />
            全部
          </button>
          {categories.map((name) => {
            const Icon = categoryIcon(name);
            return (
              <button
                key={name}
                type="button"
                aria-pressed={category === name}
                onClick={() => onCategoryChange(name)}
              >
                <Icon size={15} aria-hidden="true" />
                {name}
              </button>
            );
          })}
        </div>
      </div>
      <Dialog
        trigger={
          <button type="button" className={styles.settings}>
            <Settings size={16} aria-hidden="true" />
            设置
          </button>
        }
        title="热榜设置"
        description="选择总览中显示的来源，即时生效；左侧来源列表仍可访问全部平台。"
      >
        <div className={styles.options}>
          <ScrollArea label="热榜设置来源">
            <fieldset className={styles.fieldset}>
              <legend>显示来源</legend>
              {sources.map((source) => (
                <label key={source.id}>
                  <input
                    type="checkbox"
                    checked={!hiddenIds.includes(source.id)}
                    onChange={() => onToggleSource(source.id)}
                  />
                  {source.name}
                </label>
              ))}
            </fieldset>
          </ScrollArea>
        </div>
        <button className={styles.reset} type="button" onClick={onReset}>
          恢复全部来源
        </button>
      </Dialog>
    </div>
  );
}
