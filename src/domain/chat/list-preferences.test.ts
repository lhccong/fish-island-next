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

  it('validates stable keys and persists only nonempty overrides', () => {
    const appearance = {
      ...defaultChatListAppearance(),
      conversationOrder: ['cover:service', 'member:synthetic'],
      conversationEdits: {
        'cover:service': { name: ' 通知 ', preview: ' ' },
        'member:synthetic': { name: '', preview: '' },
      },
    };
    expect(parseChatListAppearance(appearance)).toEqual({
      ...appearance,
      conversationEdits: { 'cover:service': { name: '通知', preview: '' } },
    });
    expect(() =>
      parseChatListAppearance({
        ...appearance,
        conversationOrder: ['cover:service', 'cover:service'],
      }),
    ).toThrow('对话顺序格式无效');
    expect(() =>
      parseChatListAppearance({
        ...appearance,
        conversationEdits: { unrelated: { name: '', preview: '' } },
      }),
    ).toThrow('对话文案格式无效');
  });
});
