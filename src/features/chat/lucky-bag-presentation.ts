import { useEffect, useState } from 'react';
import type { LuckyBagDetail } from '@/domain/chat';

export function useLuckyBagDue(detail: LuckyBagDetail | null) {
  const [now, setNow] = useState(Date.now);
  const status = detail?.status;
  const drawTime = detail?.drawTime;
  useEffect(() => {
    if (drawTime === undefined || status !== 0) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, drawTime - Date.now()) + 20);
    return () => clearTimeout(timer);
  }, [status, drawTime]);
  return !!detail && detail.drawTime <= now;
}
