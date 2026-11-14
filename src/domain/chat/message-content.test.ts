import { describe, expect, it } from 'vitest';
import {
  chatImageUrl,
  parseMessageContent,
  messageClipboardText,
  messagePreview,
  hasRewardMessageContent,
} from './message-content';

it('identifies rendered reward cards in mixed messages without blocking ordinary text or images', () => {
  for (const tag of ['redpacket', 'luckybag', 'REDPACKET', 'LuckyBag']) {
    expect(hasRewardMessageContent(`前文[${tag}]synthetic-id[/${tag}]后文`)).toBe(true);
  }
  for (const content of [
    '普通消息',
    '[img]https://synthetic.test/image.png[/img]',
    '红包和福袋',
    '[luckybag]missing-close',
  ])
    expect(hasRewardMessageContent(content)).toBe(false);
});

it('copies image URLs as text and renders bounded quote previews without retaining markup', () => {
  const content = '合成[img]https://example.test/a.png[/img]消息';
  expect(messageClipboardText(content)).toBe('合成\nhttps://example.test/a.png\n消息');
  expect(messagePreview(content)).toBe('合成[图片]消息');
  expect(messagePreview('🐟'.repeat(130))).toBe('🐟'.repeat(120) + '…');
});

describe('legacy chat images', () => {
  it('parses mixed text, case-insensitive tags and query strings without executing HTML', () => {
    expect(
      parseMessageContent('前文[IMG] https://images.test/a.png?w=500&h=50 [/IMG]<b>后文</b>'),
    ).toEqual([
      { kind: 'text', text: '前文' },
      { kind: 'image', url: 'https://images.test/a.png?w=500&h=50' },
      { kind: 'text', text: '<b>后文</b>' },
    ]);
    expect(parseMessageContent('https://images.test/a.png')).toEqual([
      { kind: 'text', text: 'https://images.test/a.png' },
    ]);
    expect(parseMessageContent('')).toEqual([]);
  });
  it('keeps malformed and unsafe tags as text and limits image requests', () => {
    for (const content of [
      '[img]javascript:alert(1)[/img]',
      '[img]data:image/png;base64,a[/img]',
      '[img]https://user:password@example.test/a[/img]',
      '[img]https://images.test/a.png',
    ])
      expect(parseMessageContent(content)).toEqual([{ kind: 'text', text: content }]);
    const parts = parseMessageContent('[img]https://images.test/a.png[/img]'.repeat(20));
    expect(parts.filter((part) => part.kind === 'image')).toHaveLength(12);
    expect(parts.at(-1)?.kind).toBe('text');
    for (const value of [
      undefined,
      1,
      '//host/a',
      'file:///a',
      'https://a.test/' + 'a'.repeat(8192),
    ])
      expect(chatImageUrl(value)).toBeNull();
  });
});

describe('legacy red packets', () => {
  it('renders packets alongside text and images, including case-insensitive tags', () => {
    const content =
      '祝福[REDPACKET] rpc_synthetic-01 [/REDPACKET]后文[img]https://images.test/a.png[/img]';
    expect(parseMessageContent(content)).toEqual([
      { kind: 'text', text: '祝福' },
      { kind: 'red-packet', id: 'rpc_synthetic-01' },
      { kind: 'text', text: '后文' },
      { kind: 'image', url: 'https://images.test/a.png' },
    ]);
    expect(messagePreview(content)).toBe('祝福[红包]后文[图片]');
    expect(messageClipboardText(content)).toBe('祝福[红包]后文\nhttps://images.test/a.png');
    expect(parseMessageContent('[redpacket]rpc1[/redpacket]'.repeat(2))).toEqual([
      { kind: 'red-packet', id: 'rpc1' },
      { kind: 'red-packet', id: 'rpc1' },
    ]);
  });

  it('preserves malformed tags without swallowing following valid packets', () => {
    for (const content of [
      '[redpacket][/redpacket]',
      '[redpacket]rpc1',
      '[redpacket]<script>bad</script>[/redpacket]',
      '[redpacket]rpc[bad][/redpacket]',
      `[redpacket]${'a'.repeat(129)}[/redpacket]`,
    ]) {
      expect(parseMessageContent(content)).toEqual([{ kind: 'text', text: content }]);
      expect(parseMessageContent(content + '[redpacket]rpc2[/redpacket]').at(-1)).toEqual(
        content.endsWith('[/redpacket]')
          ? { kind: 'red-packet', id: 'rpc2' }
          : { kind: 'text', text: content + '[redpacket]rpc2[/redpacket]' },
      );
    }
  });
  it('bounds packet detail requests per message while retaining the remaining text', () => {
    const content = '[redpacket]rpc_synthetic[/redpacket]'.repeat(20);
    const parts = parseMessageContent(content);
    expect(parts.filter((part) => part.kind === 'red-packet')).toHaveLength(12);
    expect(parts.at(-1)).toEqual({
      kind: 'text',
      text: '[redpacket]rpc_synthetic[/redpacket]'.repeat(8),
    });
  });
});
