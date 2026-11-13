import { expect, it } from 'vitest';
import { mentionQuery } from './composer-mention';

it('matches a mention at the caret, preserving trailing text and punctuation boundaries', () => {
  expect(mentionQuery('你好，@岛 后文', 5)).toEqual({ start: 3, end: 5, query: '岛' });
  expect(mentionQuery('@', 1)).toEqual({ start: 0, end: 1, query: '' });
  expect(mentionQuery('你好@小鱼', 5)).toEqual({ start: 2, end: 5, query: '小鱼' });
  expect(mentionQuery('第一行\n@小鱼', 7)).toEqual({ start: 4, end: 7, query: '小鱼' });
});

it('ignores email addresses, completed mentions and non-collapsed selections', () => {
  expect(mentionQuery('a@fish.com', 10)).toBeNull();
  expect(mentionQuery('@小鱼 ', 4)).toBeNull();
  expect(mentionQuery('@小鱼', 1, 3)).toBeNull();
});
