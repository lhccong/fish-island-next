import { expect, it } from 'vitest';
import { validateRedPacketForm, type RedPacketFormValues } from './red-packet';
const values: RedPacketFormValues = {
  type: 1,
  totalAmount: '10',
  count: '1',
  name: ' 合成祝福 ',
  answer: 'not sent',
};
it('validates point limits and preserves the backend integer division rule', () => {
  expect(validateRedPacketForm(values)).toEqual({
    type: 1,
    totalAmount: 10,
    count: 1,
    name: '合成祝福',
  });
  for (const patch of [
    { totalAmount: '' },
    { totalAmount: '1.5' },
    { totalAmount: '1e2' },
    { totalAmount: '101' },
    { count: '0' },
    { count: '11' },
    { totalAmount: '100', count: '9' },
  ])
    expect(() => validateRedPacketForm({ ...values, ...patch })).toThrow();
  expect(validateRedPacketForm({ ...values, totalAmount: '21', count: '2' }).count).toBe(2);
});
it('requires quiz title and answer and never includes ordinary packet answers', () => {
  for (const patch of [
    { name: '' },
    { answer: ' ' },
    { answer: 'x'.repeat(51) },
    { name: 'x'.repeat(201) },
  ])
    expect(() => validateRedPacketForm({ ...values, type: 3, ...patch })).toThrow();
  expect(validateRedPacketForm({ ...values, type: 3, answer: ' 鱼 ' }).answer).toBe('鱼');
});
