export interface DrawPlayer {
  id: string;
  name: string;
  avatar?: string | null;
  score: number;
  correct: boolean;
}
export interface DrawRoom {
  id: string;
  creatorId: string;
  creatorName: string;
  status: 'WAITING' | 'PLAYING' | 'ENDED';
  maxPlayers: number;
  players: DrawPlayer[];
  count: number;
  drawerId: string;
  drawerName: string;
  word: string;
  hint: string;
  round: number;
  rounds: number;
  /** 回合结束的 Unix 毫秒时间戳；未开始为 0。 */
  endTime: number;
  image: string;
  creatorOnly: boolean;
}
export interface DrawSettings {
  maxPlayers: number;
  totalRounds: number;
  creatorOnlyMode: boolean;
  wordType: string;
}
export interface DrawGuess {
  id: string;
  name: string;
  word: string;
  correct: boolean;
}
export interface DrawIdentity {
  id: string;
  name: string;
  avatarUrl: string | null;
  role?: string;
}
export interface DrawPort {
  rooms(signal: AbortSignal): Promise<DrawRoom[]>;
  room(id: string, signal: AbortSignal): Promise<DrawRoom | null>;
  guesses(id: string, signal: AbortSignal): Promise<DrawGuess[]>;
  create(settings: DrawSettings, signal: AbortSignal): Promise<string>;
  action(
    action: 'join' | 'quit' | 'start' | 'end' | 'next-round' | 'remove',
    id: string,
    signal: AbortSignal,
  ): Promise<void>;
  save(id: string, image: string, signal: AbortSignal): Promise<void>;
  guess(
    id: string,
    word: string,
    user: DrawIdentity,
    signal: AbortSignal,
  ): Promise<DrawGuess | null>;
}
export interface DrawRealtimePort {
  subscribe(listener: (roomId: string | null) => void): () => void;
  messages(listener: (message: DrawMessage) => void): () => void;
}
export interface DrawMessage {
  id: string;
  roomId: string;
  name: string;
  content: string;
}
