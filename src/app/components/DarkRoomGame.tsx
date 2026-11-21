import { useAppearanceStore } from '@/features/appearance';
import { DarkRoom } from '@/features/dark-room';

export function DarkRoomGame({ onEscape }: { onEscape?: () => void }) {
  const skinId = useAppearanceStore((state) => state.skinId);
  const colorMode = useAppearanceStore((state) => state.colorMode);
  return <DarkRoom skinId={skinId} colorMode={colorMode} onEscape={onEscape} />;
}
