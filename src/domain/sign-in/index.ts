export interface SignDay {
  day: number;
  date: string;
  rewardPoints: number;
  signed: boolean;
  isToday: boolean;
  canMakeUp: boolean;
  signType: number | null;
}
export interface SignMonth {
  year: number;
  month: number;
  continuousDays: number;
  totalSignInDays: number;
  currentPoints: number;
  remainMakeUpCount: number;
  days: SignDay[];
}
export interface SignResult {
  totalPoints: number;
  bonusPoints: number;
  nextDayBonus: number;
}
export interface SignInPort {
  month(year: number, month: number, signal: AbortSignal): Promise<SignMonth>;
  status(signal: AbortSignal): Promise<boolean>;
  sign(signal: AbortSignal): Promise<SignResult>;
  makeUp(date: string, signal: AbortSignal): Promise<SignResult>;
}
export function shiftMonth(year: number, month: number, delta: number) {
  const value = new Date(year, month - 1 + delta, 1);
  return { year: value.getFullYear(), month: value.getMonth() + 1 };
}
