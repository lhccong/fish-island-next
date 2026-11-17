export interface ChatMusicSong {
  source: 'netease' | 'tencent';
  id: string;
  name: string;
  artist: string;
}
function validSong(value: unknown): ChatMusicSong | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (
    (row.source !== 'netease' && row.source !== 'tencent') ||
    typeof row.id !== 'string' ||
    !/^[a-z0-9_-]{1,200}$/i.test(row.id) ||
    typeof row.name !== 'string' ||
    !row.name.trim() ||
    row.name.length > 200 ||
    typeof row.artist !== 'string' ||
    row.artist.length > 200 ||
    Array.from(row.name + row.artist).some((character) => character.charCodeAt(0) < 32)
  )
    return null;
  return { source: row.source, id: row.id, name: row.name, artist: row.artist };
}
export function encodeMusicMessage(song: ChatMusicSong): string {
  const safe = validSong(song);
  if (!safe) throw new Error('歌曲信息无效，请重新搜索');
  return `[music]${encodeURIComponent(JSON.stringify({ v: 1, ...safe }))}[/music]`;
}
export function parseMusicMessage(content: string): ChatMusicSong | null {
  if (!content.startsWith('[music]') || !content.endsWith('[/music]') || content.length > 5000)
    return null;
  try {
    const value: unknown = JSON.parse(decodeURIComponent(content.slice(7, -8)));
    if (!value || typeof value !== 'object' || !('v' in value) || value.v !== 1) return null;
    return validSong(value);
  } catch {
    return null;
  }
}
