import type { MusicPort, MusicSource, Song } from './domain';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('音乐数据异常，请重试');
  return value as Record<string, unknown>;
}
export function playableUrl(value: unknown): string {
  if (typeof value !== 'string') throw new Error('这首歌曲暂无可用音源，请换一首');
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    !host.includes('.') ||
    host === 'localhost' ||
    host.endsWith('.local') ||
    /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
    url.searchParams.has('auth') ||
    url.searchParams.get('type') === 'url' ||
    /\/song\/media\/outer\/url/i.test(url.pathname)
  )
    throw new Error('这首歌曲暂无可用音源，请换一首');
  return url.href;
}
export function createMusicClient(
  baseUrl: string,
  token: () => { name: string; value: string } | null,
  onExpired: () => void,
): MusicPort {
  async function request(path: string, params: URLSearchParams, signal: AbortSignal) {
    const credential = token();
    if (!credential) throw new Error('请登录后使用音乐');
    const response = await fetch(
      `${baseUrl.replace(/\/+$/, '')}/api/third-party/music/${path}?${params}`,
      {
        headers: { [credential.name]: credential.value },
        credentials: 'include',
        cache: 'no-store',
        signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]),
      },
    );
    if (response.status === 401) {
      onExpired();
      throw new Error('登录已过期，请重新登录');
    }
    const payload = object(await response.json());
    if (payload.code === 40100) {
      onExpired();
      throw new Error('登录已过期，请重新登录');
    }
    if (!response.ok || payload.code !== 0)
      throw new Error(
        typeof payload.message === 'string'
          ? payload.message.slice(0, 160)
          : '音乐服务暂不可用，请重试',
      );
    return payload.data;
  }
  function songs(data: unknown, source: MusicSource, limit = 20): Song[] {
    if (!Array.isArray(data) || data.length > limit) throw new Error('音乐数据异常，请重试');
    return data.map((raw): Song => {
      const row = object(raw);
      if (
        typeof row.id !== 'string' ||
        !row.id ||
        typeof row.name !== 'string' ||
        !row.name ||
        typeof row.artist !== 'string'
      )
        throw new Error('音乐数据异常，请重试');
      return {
        id: row.id,
        name: row.name.slice(0, 200),
        artist: row.artist.slice(0, 200),
        source,
      };
    });
  }
  return {
    async search(source, keyword, page, signal) {
      return songs(
        await request(
          'search',
          new URLSearchParams({ source, keyword, page: String(page) }),
          signal,
        ),
        source,
      );
    },
    async recommend(source, signal) {
      return songs(
        await request('recommendations', new URLSearchParams({ source }), signal),
        source,
      );
    },
    async daily(signal) {
      return songs(await request('daily', new URLSearchParams(), signal), 'netease', 30);
    },
    async resolve(song, signal) {
      return playableUrl(
        await request('url', new URLSearchParams({ source: song.source, id: song.id }), signal),
      );
    },
  };
}
