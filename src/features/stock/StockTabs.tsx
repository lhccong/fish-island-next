import { useId, type KeyboardEvent } from 'react';
import { ChartNoAxesCombined, Wallet, History } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import styles from './StockWorkspace.module.css';
export type StockTab = 'market' | 'positions' | 'history';
const tabs = [
  { id: 'market', label: '市场行情', icon: ChartNoAxesCombined },
  { id: 'positions', label: '我的持仓', icon: Wallet },
  { id: 'history', label: '交易记录', icon: History },
] as const;
export function StockTabs({
  value,
  onChange,
}: {
  value: StockTab;
  onChange: (tab: StockTab) => void;
}) {
  const id = useId();
  const key = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % 3;
    else if (event.key === 'ArrowLeft') next = (index + 2) % 3;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = 2;
    else return;
    event.preventDefault();
    onChange(tabs[next]!.id);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus();
  };
  return (
    <div className={styles.tabs} role="tablist" aria-label="股市分类">
      {tabs.map((tab, i) => (
        <Button
          key={tab.id}
          id={`${id}-${tab.id}`}
          role="tab"
          aria-selected={value === tab.id}
          aria-controls={`stock-${tab.id}`}
          tabIndex={value === tab.id ? 0 : -1}
          variant="secondary"
          onClick={() => onChange(tab.id)}
          onKeyDown={(e) => key(e, i)}
        >
          <tab.icon size={15} aria-hidden="true" />
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
