import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import styles from './Draw.module.css';
export function RoundClock({ endTime }: { endTime: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <span className={styles.clock} aria-label="回合剩余时间">
      <Timer size={16} aria-hidden="true" />
      {endTime ? `${Math.max(0, Math.ceil((endTime - now) / 1000))} 秒` : '等待开始'}
    </span>
  );
}
