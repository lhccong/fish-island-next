import { useNavigate } from 'react-router';
import type { DailyPointTaskId } from '@/domain/sign-in';

const destinations: Record<Exclude<DailyPointTaskId, 'sign_in' | 'sign_in_makeup'>, string> = {
  speak: '/chat',
  moments_publish: '/moments/fish-circle',
  moments_like: '/moments/fish-circle',
  pet_treasure: '/pet',
  free_draw: '/pet?panel=supplies',
  tower_climb: '/pet?challenge=tower',
  farm_harvest: '/game/farm',
  farm_steal: '/game/farm',
  item_decompose: '/pet?panel=bag',
  pet_daily: '/pet',
  tournament_rank: '/pet?challenge=tournament',
  red_packet_grab: '/chat',
  lucky_bag_win: '/chat',
  moments_reward: '/moments/fish-circle',
  redeem_code: '/utils/avatar-frames?tool=redeem',
  sponsor: '/rank/reward',
  BOSS_KILL: '/pet?challenge=boss',
};

export function useDailyPointTaskNavigation() {
  const navigate = useNavigate();
  return (task: DailyPointTaskId) => {
    if (task !== 'sign_in' && task !== 'sign_in_makeup') void navigate(destinations[task]);
  };
}
