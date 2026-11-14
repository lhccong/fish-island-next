import { WindowLauncher } from '@/shared/ui/WindowLauncher';
import { gameTitles, useGameWindows, type GameId } from './game-windows-context';

export function GameWindowLauncher({ game }: { game: GameId }) {
  const open = useGameWindows();
  return <WindowLauncher label={`独立窗口打开${gameTitles[game]}`} onClick={() => open(game)} />;
}
