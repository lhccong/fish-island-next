import { useState } from 'react';
import type { ChatPreferencesPort } from '@/domain/chat';

export function useImagePreference(preferences: ChatPreferencesPort) {
  const [deferImages, setDeferImages] = useState(() => {
    try {
      return preferences.readDeferImages();
    } catch {
      return false;
    }
  });
  const [notice, setNotice] = useState('');
  const change = (value: boolean) => {
    setDeferImages(value);
    try {
      preferences.writeDeferImages(value);
      setNotice('');
    } catch {
      setNotice('图片偏好未能保存，当前页面已生效');
    }
  };
  return { deferImages, change, notice };
}
