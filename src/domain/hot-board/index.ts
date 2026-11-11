export interface HotEntry {
  id: string;
  rank: number;
  title: string;
  url: string | null;
  heat: number | null;
}

export interface HotSource {
  id: string;
  name: string;
  badgeLabel: string;
  category: string;
  iconUrl: string | null;
  updatedAt: string | null;
  entries: readonly HotEntry[];
}

export interface HotBoardPort {
  load(signal: AbortSignal): Promise<readonly HotSource[]>;
}
