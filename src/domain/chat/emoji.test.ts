import { expect, test } from 'vitest';
import { parseEmojiText } from './emoji';

test('parses repeated known QQ faces, preserving text and unknown or unsafe markers', () => {
  expect(parseEmojiText('前[qqface:0][qqface:0]后[qqface:9999][qqface:../0]')).toEqual([
    { text: '前' },
    { text: '[qqface:0]', id: '0' },
    { text: '[qqface:0]', id: '0' },
    { text: '后[qqface:9999][qqface:../0]' },
  ]);
  expect(parseEmojiText('普通文本')).toEqual([{ text: '普通文本' }]);
  expect(parseEmojiText('')).toEqual([]);
});
