import { useState } from 'react';
import type { ChatPreferencesPort } from '@/domain/chat';

export function useAvatarPreference(preferences: ChatPreferencesPort) {
  const [hideAvatarFrames, setHideAvatarFrames] = useState(() => {
    try {
      return preferences.readHideAvatarFrames();
    } catch {
      return false;
    }
  });
  const [frameNotice, setFrameNotice] = useState('');
  const changeFrames = (value: boolean) => {
    setHideAvatarFrames(value);
    try {
      preferences.writeHideAvatarFrames(value);
      setFrameNotice('');
    } catch {
      setFrameNotice('头像框偏好未能保存，当前页面已生效');
    }
  };
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
  return { showAvatars, change, notice, hideAvatarFrames, changeFrames, frameNotice };
}
