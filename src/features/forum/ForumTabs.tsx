import { Clock3, Flame, TrendingUp, UserRound, Star } from 'lucide-react';
import type { ForumTab } from '@/domain/forum';
import styles from './Forum.module.css';
const tabs = [
  { value: 'latest', label: '最新发布', Icon: Clock3 },
  { value: 'hot', label: '热门讨论', Icon: Flame },
  { value: 'featured', label: '精华内容', Icon: TrendingUp },
  { value: 'my', label: '我的帖子', Icon: UserRound },
  { value: 'saved', label: '我的收藏', Icon: Star },
] as const;
export function ForumTabs({
  value,
  onChange,
}: {
  value: ForumTab;
  onChange: (value: ForumTab) => void;
}) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="帖子分类">
      {tabs.map(({ value: tab, label, Icon }, index) => (
        <button
          type="button"
          role="tab"
          key={tab}
          aria-selected={tab === value}
          tabIndex={tab === value ? 0 : -1}
          onClick={() => onChange(tab)}
          onKeyDown={(e) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
            e.preventDefault();
            const next =
              e.key === 'Home'
                ? 0
                : e.key === 'End'
                  ? tabs.length - 1
                  : (index + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
            (
              e.currentTarget.parentElement?.children[next] as HTMLButtonElement | undefined
            )?.focus();
            onChange(tabs[next]!.value);
          }}
        >
          <Icon size={15} aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
