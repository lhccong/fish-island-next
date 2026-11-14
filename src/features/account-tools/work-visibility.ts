import { create } from 'zustand';
function read(): boolean {
  try {
    return localStorage.getItem('moneyButtonVisibility') !== 'false';
  } catch {
    return true;
  }
}
export const useWorkTimeVisibility = create<{
  visible: boolean;
  change: (visible: boolean) => void;
}>((set) => ({
  visible: read(),
  change: (visible) => {
    localStorage.setItem('moneyButtonVisibility', String(visible));
    set({ visible });
  },
}));
