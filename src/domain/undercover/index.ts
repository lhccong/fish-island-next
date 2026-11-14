export { createLocalGame, advanceLocalGame, localWord, wordPairs } from './local-game';
export type { LocalGame, LocalPlayer, LocalAction } from './local-game';
export interface UndercoverPlayer {
  id: string;
  name: string;
  avatar: string | null;
  eliminated: boolean;
  votes: number;
  guessesLeft: number;
}
export interface UndercoverVote {
  voterId: string;
  voterName: string;
  targetId: string;
  targetName: string;
}
export interface UndercoverRoom {
  id: string;
  status: 'WAITING' | 'PLAYING' | 'ENDED';
  creatorId: string;
  creatorName: string;
  players: UndercoverPlayer[];
  maxPlayers: number;
  mode: 1 | 2;
  word: string;
  role: 'civilian' | 'undercover' | null;
  result: string;
  votes: UndercoverVote[];
}
export interface RoomSettings {
  maxPlayers: number;
  duration: number;
  gameMode: 1 | 2;
  civilianWord: string;
  undercoverWord: string;
}
export interface UndercoverPort {
  rooms(signal: AbortSignal): Promise<UndercoverRoom[]>;
  room(id: string, signal: AbortSignal): Promise<UndercoverRoom | null>;
  create(settings: RoomSettings, signal: AbortSignal): Promise<string>;
  action(
    action: 'join' | 'quit' | 'start' | 'end' | 'remove',
    id: string,
    signal: AbortSignal,
  ): Promise<void>;
  vote(id: string, targetId: string, signal: AbortSignal): Promise<void>;
  guess(id: string, word: string, signal: AbortSignal): Promise<boolean>;
}
export interface RoomMessage {
  id: string;
  roomId: string;
  senderId: string;
  name: string;
  content: string;
  time: number;
  submitted?: boolean;
}
export type UndercoverEvent =
  | { type: 'message'; message: RoomMessage }
  | { type: 'refresh'; roomId: string | null }
  | { type: 'countdown'; roomId: string; seconds: number }
  | { type: 'connection'; connected: boolean }
  | { type: 'error'; message: string };
export interface UndercoverRealtimePort {
  connected(): boolean;
  subscribe(listener: (event: UndercoverEvent) => void): () => void;
  send(message: RoomMessage, avatar: string | null): boolean;
}
