import { expect, it } from 'vitest';
import { parseInvitationText } from './game-invitation';

it('preserves mixed text, multiple invitations and original room ID casing', () => {
  expect(
    parseInvitationText('来玩 [invite/chess]Room-1[/invite] [invite/draw]2[/invite]！'),
  ).toEqual([
    { kind: 'text', text: '来玩 ' },
    { kind: 'invitation', game: 'chess', roomId: 'Room-1' },
    { kind: 'text', text: ' ' },
    { kind: 'invitation', game: 'draw', roomId: '2' },
    { kind: 'text', text: '！' },
  ]);
});

it('recognizes the legacy undercover message and all supported invitation tags', () => {
  expect(
    parseInvitationText('<undercover>我邀请你加入谁是卧底游戏！房间ID: Room_9</undercover>'),
  ).toEqual([{ kind: 'invitation', game: 'undercover', roomId: 'Room_9' }]);
  for (const game of ['undercover', 'landlords', 'chineseChess']) {
    expect(parseInvitationText(`[invite/${game}]abc[/invite]`)).toEqual([
      { kind: 'invitation', game, roomId: 'abc' },
    ]);
  }
});

it('keeps malformed, unknown and unsafe invitations as text', () => {
  for (const text of [
    '[invite/unknown]1[/invite]',
    '[invite/constructor]1[/invite]',
    '[invite/chess]../other[/invite]',
    '[invite/draw][/invite]',
    `[invite/draw]${'a'.repeat(101)}[/invite]`,
    '<undercover>房间ID: 1?admin=true</undercover>',
    '<undercover>没有房间</undercover>',
    '[invite/chess]1',
    '<undercover><img src=x>房间ID: 1</undercover>',
  ])
    expect(parseInvitationText(text)).toEqual([{ kind: 'text', text }]);
});
