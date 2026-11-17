import { describe, expect, it } from 'vitest';
import { encodeMusicMessage, parseMusicMessage, type ChatMusicSong } from './music-message';
import { messageClipboardText, messagePreview } from './message-content';

const song: ChatMusicSong = {
  source: 'netease',
  id: '123',
  name: '合成歌曲 [img] 保持文本',
  artist: '合成歌手',
};
describe('versioned music message', () => {
  it('round trips metadata only and provides readable previews', () => {
    const content = encodeMusicMessage(song);
    expect(parseMusicMessage(content)).toEqual(song);
    expect(content).not.toContain('[img]');
    expect(messagePreview(content)).toBe(`[音乐] ${song.name} — ${song.artist}`);
    expect(messageClipboardText(content)).toBe(`[音乐] ${song.name} — ${song.artist}`);
    expect(content).not.toContain('https:');
  });
  it.each([
    '[music]broken[/music]',
    '[music]%ZZ[/music]',
    `[music]${encodeURIComponent(JSON.stringify({ v: 2, ...song }))}[/music]`,
    `[music]${encodeURIComponent(JSON.stringify({ v: 1, ...song, source: 'unknown' }))}[/music]`,
    `[music]${encodeURIComponent(JSON.stringify({ v: 1, ...song, id: 'https://bad.test' }))}[/music]`,
  ])('keeps malformed or unsupported data as text', (content) => {
    expect(parseMusicMessage(content)).toBeNull();
  });
  it('rejects invalid metadata before sending', () => {
    expect(() => encodeMusicMessage({ ...song, name: 'x'.repeat(201) })).toThrow();
    expect(() => encodeMusicMessage({ ...song, name: '控制\n字符' })).toThrow();
  });
});
