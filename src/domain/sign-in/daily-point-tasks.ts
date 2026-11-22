export const dailyPointTaskIds = [
  'sign_in',
  'speak',
  'moments_publish',
  'moments_like',
  'pet_treasure',
  'free_draw',
  'tower_climb',
  'farm_harvest',
  'farm_steal',
  'item_decompose',
  'pet_daily',
  'tournament_rank',
  'red_packet_grab',
  'lucky_bag_win',
  'moments_reward',
  'sign_in_makeup',
  'redeem_code',
  'sponsor',
  'BOSS_KILL',
] as const;

export type DailyPointTaskId = (typeof dailyPointTaskIds)[number];

export interface DailyPointTask {
  id: DailyPointTaskId;
  state: 'ready' | 'waiting' | 'done' | 'conditional';
  progress: number | null;
  goal: number | null;
  earned: number;
  detail: string | null;
}

export interface DailyPointTasks {
  serverNow: number;
  refreshAt: number;
  tasks: DailyPointTask[];
}
