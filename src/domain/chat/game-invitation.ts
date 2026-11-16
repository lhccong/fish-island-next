export type InvitationGame = 'chess' | 'draw' | 'landlords' | 'undercover' | 'chineseChess';
export type InvitationTextPart =
  { kind: 'text'; text: string } | { kind: 'invitation'; game: InvitationGame; roomId: string };

const games: Record<string, InvitationGame> = {
  chess: 'chess',
  draw: 'draw',
  landlords: 'landlords',
  undercover: 'undercover',
  chinesechess: 'chineseChess',
};

export function parseInvitationText(text: string): InvitationTextPart[] {
  const parts: InvitationTextPart[] = [];
  let position = 0;
  for (const match of text.matchAll(
    /\[invite\/([a-z]+)\]([^\][]*)\[\/invite\]|<undercover>([^<>]*)<\/undercover>/gi,
  )) {
    const key = match[1]?.toLowerCase() ?? '';
    const game =
      match[3] !== undefined ? 'undercover' : Object.hasOwn(games, key) ? games[key] : undefined;
    const roomId =
      match[3] === undefined
        ? match[2]!
        : /房间ID\s*[:：]\s*([a-z0-9_-]+)\s*$/i.exec(match[3])?.[1];
    if (!game || !roomId || !/^[a-z0-9_-]{1,100}$/i.test(roomId)) continue;
    if (match.index > position)
      parts.push({ kind: 'text', text: text.slice(position, match.index) });
    parts.push({ kind: 'invitation', game, roomId });
    position = match.index + match[0].length;
  }
  if (position < text.length) parts.push({ kind: 'text', text: text.slice(position) });
  return parts;
}
