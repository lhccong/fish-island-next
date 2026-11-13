export interface ChatEmoticon {
  id: string;
  url: string;
}
export interface ChatEmoticonPort {
  list(page: number, signal: AbortSignal): Promise<{ items: ChatEmoticon[]; total: number }>;
  search(
    keyword: string,
    page: number,
    signal: AbortSignal,
  ): Promise<{ items: ChatEmoticon[]; total: number }>;
  add(url: string, signal: AbortSignal): Promise<void>;
  remove(id: string, signal: AbortSignal): Promise<void>;
}
