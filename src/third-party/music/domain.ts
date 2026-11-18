export type MusicSource = 'netease' | 'tencent';
export interface Song {
  id: string;
  source: MusicSource;
  name: string;
  artist: string;
}
export interface MusicPort {
  search(source: MusicSource, keyword: string, page: number, signal: AbortSignal): Promise<Song[]>;
  resolve(song: Song, signal: AbortSignal): Promise<string>;
  recommend(source: MusicSource, signal: AbortSignal): Promise<Song[]>;
  daily(signal: AbortSignal): Promise<Song[]>;
}
export const songKey = (song: Song) => `${song.source}:${song.id}`;
