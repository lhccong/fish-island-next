import { useState } from 'react';
import type { ChatPreferencesPort } from '@/domain/chat';

const defaultName = '鱼岛群聊';

export function normalizeGroupName(value: string): string {
  const name = value.trim();
  if (!name) throw new Error('请输入群聊名称');
  if (Array.from(name).length > 30) throw new Error('群聊名称最多 30 个字符');
  if (
    Array.from(name).some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    throw new Error('群聊名称不能包含换行或控制字符');
  return name;
}

export function useLocalGroupName(preferences: ChatPreferencesPort) {
  const [groupName, setGroupName] = useState(() => {
    try {
      return normalizeGroupName(preferences.readGroupName() ?? defaultName);
    } catch {
      return defaultName;
    }
  });
  function saveGroupName(value: string) {
    const name = normalizeGroupName(value);
    try {
      preferences.writeGroupName(name);
    } catch {
      throw new Error('本地保存失败，请检查浏览器存储权限后重试');
    }
    setGroupName(name);
  }
  return { groupName, saveGroupName };
}
