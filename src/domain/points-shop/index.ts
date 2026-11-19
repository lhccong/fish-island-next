import type { ChatBubbleArtwork } from '@/domain/chat';

export interface ShopBubble {
  id: string;
  name: string;
  points: number;
  durationDays: number;
  expiresAt: number | null;
  equipped: boolean;
  artwork?: ChatBubbleArtwork;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  points: number;
  supported: boolean;
}
export interface PointsRecord {
  id: string;
  description: string;
  createdAt: string;
  change: number;
  available: number;
}
export interface ShopPage<T> {
  items: T[];
  total: number;
}
export interface PointsShopPort {
  items(page: number, signal: AbortSignal): Promise<ShopPage<ShopItem>>;
  records(page: number, signal: AbortSignal): Promise<ShopPage<PointsRecord>>;
  purchase(id: string, signal: AbortSignal): Promise<void>;
  bubbles(signal: AbortSignal): Promise<ShopBubble[]>;
  exchangeBubble(id: string, expectedPoints: number, signal: AbortSignal): Promise<ShopBubble[]>;
  equipBubble(id: string | null, signal: AbortSignal): Promise<ShopBubble[]>;
}
