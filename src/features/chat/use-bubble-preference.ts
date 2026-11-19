import { useState } from 'react';
import type { ChatPreferencesPort } from '@/domain/chat';

export function useBubblePreference(preferences: ChatPreferencesPort) {
  const [hideBubbleDecorations, setHideBubbleDecorations] = useState(() => {
    try {
      return preferences.readHideBubbleDecorations();
    } catch {
      return false;
    }
  });
  const [notice, setNotice] = useState('');
  const change = (value: boolean) => {
    setHideBubbleDecorations(value);
    try {
      preferences.writeHideBubbleDecorations(value);
      setNotice('');
    } catch {
      setNotice('气泡偏好未能保存，当前页面已生效');
    }
  };
  return { hideBubbleDecorations, change, notice };
}
