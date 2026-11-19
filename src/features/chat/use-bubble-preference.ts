import { useState } from 'react';
import type { ChatPreferencesPort } from '@/domain/chat';

export function useBubblePreference(preferences: ChatPreferencesPort) {
  const [hideBubbles, setHideBubbles] = useState(() => {
    try {
      return preferences.readHideBubbles();
    } catch {
      return false;
    }
  });
  const [notice, setNotice] = useState('');
  const change = (value: boolean) => {
    setHideBubbles(value);
    try {
      preferences.writeHideBubbles(value);
      setNotice('');
    } catch {
      setNotice('气泡偏好未能保存，当前页面已生效');
    }
  };
  return { hideBubbles, change, notice };
}
