import { useState } from 'react';
import type { ChatPreferencesPort } from '@/domain/chat';

export function useAvatarPreference(preferences: ChatPreferencesPort) {
  const [showAvatars, setShowAvatars] = useState(() => {
    try {
      return preferences.readShowAvatars();
    } catch {
      return true;
    }
  });
  const [notice, setNotice] = useState('');
  const change = (value: boolean) => {
    setShowAvatars(value);
    try {
      preferences.writeShowAvatars(value);
      setNotice('');
    } catch {
      setNotice('头像偏好未能保存，当前页面已生效');
    }
  };
  return { showAvatars, change, notice };
}
