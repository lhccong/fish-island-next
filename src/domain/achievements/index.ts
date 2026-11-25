export interface AchievementTrack {
  id: number;
  label: string | null;
  level: number;
  enabled: boolean;
  next: number | null;
  claimedTiers: number;
  claimablePoints: number;
}

export interface Achievement {
  id: string;
  name: string;
  label: string;
  icon: string;
  unit: '级' | '次';
  interval: number;
  points: number;
  tracks: AchievementTrack[];
}

export interface AchievementSummary {
  achievements: Achievement[];
  awardedPoints: number;
}

export interface AchievementPort {
  list(signal: AbortSignal): Promise<AchievementSummary>;
  claim(signal: AbortSignal): Promise<AchievementSummary>;
}
