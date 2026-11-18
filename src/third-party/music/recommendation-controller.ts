import { songKey, type MusicPort, type MusicSource, type Song } from './domain';

export function createMusicRecommendations(port: MusicPort) {
  let request: AbortController | undefined;
  return {
    async load(source: MusicSource, currentSong: Song | null): Promise<Song[] | null> {
      request?.abort();
      const current = new AbortController();
      request = current;
      try {
        const songs = await port.recommend(source, current.signal);
        if (current.signal.aborted) return null;
        const unique = new Map(songs.slice(0, 20).map((song) => [songKey(song), song]));
        if (currentSong) unique.delete(songKey(currentSong));
        const batch = [...unique.values()];
        if (!batch.length) throw new Error('暂无推荐歌曲，请重试或更换音乐来源');
        return batch;
      } catch (error) {
        if (current.signal.aborted) return null;
        throw error;
      } finally {
        if (request === current) request = undefined;
      }
    },
    cancel() {
      request?.abort();
      request = undefined;
    },
  };
}
