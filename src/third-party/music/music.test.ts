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
  const port: MusicPort = { search: vi.fn(), recommend: vi.fn(), daily: vi.fn(), resolve };
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
  it('starts recommended music without a keyword, prioritizes manual songs and refills only on demand', async () => {
    const { player, port, audio } = setup();
    const recommend = vi
      .mocked(port.recommend)
      .mockResolvedValue([song('1'), song('1'), song('2')]);
    player.toggleRecommendations('netease');
    player.next();
    await settle();
    expect(recommend).toHaveBeenCalledTimes(1);
    expect(recommend.mock.calls[0]?.[0]).toBe('netease');
    expect(port.search).not.toHaveBeenCalled();
    expect(player.store.getState().status).toBe('playing');
    const first = player.store.getState().current;
    player.add(song('manual'));
    audio.dispatchEvent(new Event('ended'));
    await settle();
    expect(player.store.getState().current?.id).toBe('manual');
    player.next();
    await settle();
    expect(first?.id).toBe('1');
    expect(player.store.getState().current?.id).toBe('2');
    expect(recommend).toHaveBeenCalledTimes(1);
    player.next();
    await settle();
    expect(recommend).toHaveBeenCalledTimes(2);
    player.toggleRecommendations('netease');
    expect(player.store.getState().current).not.toBeNull();
    expect(player.store.getState().recommendationSource).toBeNull();
    player.stop();
    expect(player.store.getState().current).toBeNull();
    player.dispose();
  });
  it('exposes empty recommended batches and retries explicitly without looping on errors', async () => {
    const { player, port } = setup();
    const recommend = vi
      .mocked(port.recommend)
      .mockResolvedValueOnce([])
      .mockResolvedValue([song('1')]);
    player.toggleRecommendations('netease');
    await settle();
    expect(player.store.getState().recommendationStatus).toBe('error');
    expect(recommend).toHaveBeenCalledTimes(1);
    player.retryRecommendations();
    await settle();
    expect(player.store.getState().status).toBe('playing');
    expect(recommend).toHaveBeenCalledTimes(2);
    player.next();
    await settle();
    expect(player.store.getState().recommendationStatus).toBe('error');
    expect(recommend).toHaveBeenCalledTimes(3);
    player.dispose();
  });
  it('cancels recommended requests on source change, manual playback, disabling and disposal', async () => {
    const { player, port } = setup();
    const responses: Array<(songs: Song[]) => void> = [];
    const recommend = vi
      .mocked(port.recommend)
      .mockImplementation(() => new Promise((done) => responses.push(done)));
    player.toggleRecommendations('netease');
    player.changeRecommendationSource('tencent');
    expect(recommend.mock.calls[1]?.[0]).toBe('tencent');
    expect(recommend.mock.calls[0]?.[1].aborted).toBe(true);
    player.add(song('manual'));
    expect(recommend.mock.calls[1]?.[1].aborted).toBe(true);
    responses.forEach((respond) => respond([song('late')]));
    await settle();
    expect(player.store.getState().current?.id).toBe('manual');
    player.next();
    player.toggleRecommendations('netease');
    expect(recommend.mock.calls[2]?.[1].aborted).toBe(true);
    responses[2]!([song('late')]);
    await settle();
    expect(player.store.getState().current?.id).toBe('manual');
    player.stop();
    player.toggleRecommendations('netease');
    player.dispose();
    expect(recommend.mock.calls[3]?.[1].aborted).toBe(true);
    responses[3]!([song('late')]);
    await settle();
    expect(player.store.getState().current).toBeNull();
  });
});
describe('music search requests', () => {
  it('allows one page in flight, deduplicates repeated pages and stops', async () => {
    const search = vi
      .fn<MusicPort['search']>()
      .mockResolvedValue(Array.from({ length: 20 }, (_, n) => song(String(n))));
    const controller = createMusicSearch({
      search,
      recommend: vi.fn(),
      daily: vi.fn(),
      resolve: vi.fn(),
    });
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
    const controller = createMusicSearch({
      search,
      recommend: vi.fn(),
      daily: vi.fn(),
      resolve: vi.fn(),
    });
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
  it('requests recommendations independently of search and the local queue', async () => {
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ code: 0, data: [song('fresh')] })));
    try {
      const client = createMusicClient(
        'https://island.example.test',
        () => ({ name: 'synthetic-session', value: 'synthetic-value' }),
        vi.fn(),
      );
      const songs = await client.recommend('tencent', new AbortController().signal);
      expect(String(fetcher.mock.calls[0]?.[0])).toBe(
        'https://island.example.test/api/third-party/music/recommendations?source=tencent',
      );
      expect(songs).toEqual([{ ...song('fresh'), source: 'tencent' }]);
    } finally {
      fetcher.mockRestore();
    }
  });
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
