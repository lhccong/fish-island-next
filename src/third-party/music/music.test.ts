import { describe, expect, it, vi } from 'vitest';
import { createMusicPlayer } from './player-controller';
import { createMusicSearch } from './search-controller';
import { createMusicClient, playableUrl } from './client';
import type { MusicPort, Song } from './domain';

const song = (id: string): Song => ({
  id,
  name: `合成歌曲${id}`,
  artist: '合成歌手',
  source: 'netease',
});
const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};
class FakeAudio extends EventTarget {
  src = '';
  preload = '';
  volume = 1;
  currentTime = 0;
  duration = 180;
  paused = true;
  play = vi.fn(async () => {
    this.paused = false;
    this.dispatchEvent(new Event('playing'));
  });
  pause() {
    this.paused = true;
    this.dispatchEvent(new Event('pause'));
  }
  load = vi.fn();
  removeAttribute() {
    this.src = '';
  }
}
function setup(
  resolve = vi.fn<MusicPort['resolve']>().mockResolvedValue('https://cdn.example.test/song.mp3'),
) {
  const audio = new FakeAudio();
  const port: MusicPort = { search: vi.fn(), resolve };
  return { audio, port, player: createMusicPlayer(port, audio as unknown as HTMLAudioElement) };
}
describe('independent music player', () => {
  it('deduplicates a bounded queue, advances on ended, isolates progress and releases media', async () => {
    const { player, audio } = setup();
    player.add(song('1'));
    await settle();
    expect(player.store.getState().status).toBe('playing');
    for (let n = 2; n < 60; n++) player.add(song(String(n)));
    player.add(song('2'));
    expect(player.store.getState().queue).toHaveLength(50);
    let mainUpdates = 0;
    const unsubscribe = player.store.subscribe(() => mainUpdates++);
    audio.currentTime = 15;
    audio.dispatchEvent(new Event('timeupdate'));
    expect(player.progress.getState().position).toBe(15);
    expect(mainUpdates).toBe(0);
    audio.dispatchEvent(new Event('ended'));
    await settle();
    expect(player.store.getState().current?.id).toBe('2');
    player.toggle();
    expect(player.store.getState().status).toBe('paused');
    player.toggle();
    await settle();
    expect(player.store.getState().status).toBe('playing');
    player.dispose();
    expect(audio.src).toBe('');
    expect(audio.paused).toBe(true);
    const updates = mainUpdates;
    audio.dispatchEvent(new Event('playing'));
    expect(mainUpdates).toBe(updates);
    unsubscribe();
  });
  it('ignores late song resolutions and release while resolving', async () => {
    const responses: Array<(url: string) => void> = [];
    const resolve = vi.fn<MusicPort['resolve']>(() => new Promise((done) => responses.push(done)));
    const { player, audio } = setup(resolve);
    player.add(song('1'));
    player.add(song('2'));
    player.next();
    expect(resolve.mock.calls[0]?.[1].aborted).toBe(true);
    responses[0]!('https://cdn.example.test/old.mp3');
    await settle();
    expect(audio.src).toBe('');
    responses[1]!('https://cdn.example.test/new.mp3');
    await settle();
    expect(audio.src).toContain('new.mp3');
    player.add(song('3'));
    player.next();
    player.dispose();
    responses[2]!('https://cdn.example.test/late.mp3');
    await settle();
    expect(audio.src).toBe('');
  });
  it('surfaces unavailable songs and permits a deliberate retry', async () => {
    const resolve = vi
      .fn<MusicPort['resolve']>()
      .mockRejectedValueOnce(new Error('暂无音源'))
      .mockResolvedValue('https://cdn.example.test/retry.mp3');
    const { player } = setup(resolve);
    player.add(song('1'));
    await settle();
    expect(player.store.getState().status).toBe('error');
    player.toggle();
    await settle();
    expect(player.store.getState().status).toBe('playing');
    player.dispose();
  });
});
describe('music search requests', () => {
  it('allows one page in flight, deduplicates repeated pages and stops', async () => {
    const search = vi
      .fn<MusicPort['search']>()
      .mockResolvedValue(Array.from({ length: 20 }, (_, n) => song(String(n))));
    const controller = createMusicSearch({ search, resolve: vi.fn() });
    controller.search('netease', '合成');
    void controller.load();
    await settle();
    expect(search).toHaveBeenCalledTimes(1);
    await controller.load();
    expect(controller.store.getState()).toMatchObject({ hasMore: false, status: 'ready' });
    expect(controller.store.getState().items).toHaveLength(20);
    await controller.load();
    expect(search).toHaveBeenCalledTimes(2);
    controller.dispose();
  });
  it('cancels on filter change, ignores old responses and retries errors explicitly', async () => {
    let old!: (songs: Song[]) => void;
    const search = vi
      .fn<MusicPort['search']>()
      .mockImplementationOnce(
        () =>
          new Promise((done) => {
            old = done;
          }),
      )
      .mockRejectedValueOnce(new Error('配置错误'))
      .mockResolvedValue([song('new')]);
    const controller = createMusicSearch({ search, resolve: vi.fn() });
    controller.search('netease', '旧');
    controller.search('tencent', '新');
    await settle();
    expect(search.mock.calls[0]?.[3].aborted).toBe(true);
    old([song('old')]);
    await settle();
    expect(controller.store.getState()).toMatchObject({
      status: 'error',
      error: '配置错误',
      items: [],
    });
    expect(search).toHaveBeenCalledTimes(2);
    await controller.load();
    expect(controller.store.getState().items[0]?.id).toBe('new');
    controller.dispose();
  });
});
describe('music transport', () => {
  it('only calls the island backend with the island session', async () => {
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ code: 0, data: [song('1')] })));
    const client = createMusicClient(
      'https://island.example.test',
      () => ({ name: 'synthetic-session', value: 'synthetic-value' }),
      vi.fn(),
    );
    await client.search('netease', '合成', 1, new AbortController().signal);
    expect(String(fetcher.mock.calls[0]?.[0])).toContain(
      'https://island.example.test/api/third-party/music/search?',
    );
    expect(fetcher.mock.calls[0]?.[1]?.headers).toEqual({ 'synthetic-session': 'synthetic-value' });
    fetcher.mockRestore();
  });
  it.each([
    'http://cdn.example.test/a',
    'https://127.0.0.1/a',
    'https://upstream.example.test/api?type=url&id=1',
    'https://music.163.com/song/media/outer/url?id=1',
    'https://cdn.example.test/a?auth=synthetic',
  ])('rejects unusable media %s', (url) => expect(() => playableUrl(url)).toThrow());
});
