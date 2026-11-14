import { expect, it } from 'vitest';
import { validateLuckyBagForm, type LuckyBagFormValues } from './lucky-bag';
import { messageClipboardText, messagePreview, parseMessageContent } from './message-content';

const values: LuckyBagFormValues = {
  name: '',
  type: 1,
  totalAmount: '100',
  winnerCount: '2',
  durationSeconds: '60',
};
it('validates integral prizes, winners, allocation and duration at backend boundaries', () => {
  expect(validateLuckyBagForm(values)).toEqual({
    name: '快来参与福袋吧',
    type: 1,
    totalAmount: 100,
    winnerCount: 2,
    durationSeconds: 60,
  });
  for (const patch of [
    { totalAmount: '0' },
    { totalAmount: '101' },
    { totalAmount: '1.5' },
    { totalAmount: '1e2' },
    { winnerCount: '1' },
    { winnerCount: '21' },
    { totalAmount: '1', winnerCount: '2' },
    { durationSeconds: '59' },
    { durationSeconds: '1801' },
    { name: '鱼'.repeat(51) },
  ])
    expect(() => validateLuckyBagForm({ ...values, ...patch })).toThrow();
  expect(validateLuckyBagForm({ ...values, type: 2, durationSeconds: '1800' }).type).toBe(2);
});
it('parses mixed legacy lucky bags safely and renders clipboard and quote summaries', () => {
  const content = '快来[LuckyBag] lb_synthetic-01 [/LuckyBag]参加';
  expect(parseMessageContent(content)).toEqual([
    { kind: 'text', text: '快来' },
    { kind: 'lucky-bag', id: 'lb_synthetic-01' },
    { kind: 'text', text: '参加' },
  ]);
  expect(messageClipboardText(content)).toBe('快来[福袋]参加');
  expect(messagePreview(content)).toBe('快来[福袋]参加');
  for (const invalid of ['', '<script>', 'a/b', 'a'.repeat(129)]) {
    const text = `[luckybag]${invalid}[/luckybag]`;
    expect(parseMessageContent(text)).toEqual([{ kind: 'text', text }]);
  }
  expect(
    parseMessageContent('[luckybag]bag[/luckybag]'.repeat(20)).filter(
      (part) => part.kind === 'lucky-bag',
    ),
  ).toHaveLength(12);
});
