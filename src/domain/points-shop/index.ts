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
}
