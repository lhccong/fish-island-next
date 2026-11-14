import { describe, expect, it } from 'vitest';
import { defaultChatListAppearance, parseChatListAppearance } from './list-preferences';

describe('chat list appearance', () => {
  it('normalizes custom text without linking it to members', () => {
    expect(
      parseChatListAppearance({
        custom: true,
        groupPreview: ' 本周计划 ',
        entries: [{ id: 'one', name: ' Todo ', preview: ' 整理需求 ' }],
      }),
    ).toEqual({
      custom: true,
      groupPreview: '本周计划',
      entries: [{ id: 'one', name: 'Todo', preview: '整理需求' }],
    });
  });
  it('rejects invalid storage, duplicate identities, blank names and oversized lists', () => {
    const entry = { id: 'one', name: '任务', preview: '' };
    for (const value of [
      null,
      {},
      { ...defaultChatListAppearance(), entries: [entry, entry] },
      { ...defaultChatListAppearance(), entries: [{ ...entry, name: ' ' }] },
      {
        ...defaultChatListAppearance(),
        entries: Array.from({ length: 51 }, (_, id) => ({ ...entry, id: String(id) })),
      },
    ])
      expect(() => parseChatListAppearance(value)).toThrow();
  });
});
