export interface Broadcast {
  id: string;
  content: string;
  publishedAt: number;
}
export interface BroadcastPort {
  subscribe(listener: (event: Broadcast) => void): () => void;
}
