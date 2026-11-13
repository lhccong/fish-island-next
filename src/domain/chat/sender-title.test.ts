import { expect, it } from 'vitest';
import { senderTitle } from './sender-title';
it('resolves public title IDs and levels without inventing unknown titles', () => {
  expect(senderTitle('7', 1)).toBe('电玩少女');
  expect(senderTitle('-1', 1)).toBe('摸鱼监督员');
  expect(senderTitle('0', 7)).toBe('摸鱼真人');
  expect(senderTitle('custom', 7)).toBe('称号未收录');
  expect(senderTitle('36', 7)).toBe('称号未收录');
  expect(senderTitle('0', 13)).toBe('等级 13');
  expect(senderTitle('toString', 7)).toBe('称号未收录');
  expect(senderTitle(undefined, undefined)).toBe('称号未提供');
});
