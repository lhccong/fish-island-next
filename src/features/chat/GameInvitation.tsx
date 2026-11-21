import { Gamepad2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { InvitationGame } from '@/domain/chat';
import { supportsSpectators } from '@/domain/gomoku';
import { Button } from '@/shared/ui/Button';
import styles from './MessageText.module.css';

const names = {
  chess: '五子棋',
  draw: '你画我猜',
  landlords: '斗地主',
  undercover: '谁是卧底',
  chineseChess: '中国象棋',
};

export function GameInvitation({ game, roomId }: { game: InvitationGame; roomId: string }) {
  const navigate = useNavigate();
  const id = encodeURIComponent(roomId);
  const canWatch = game === 'chess' && supportsSpectators(roomId);
  const target = {
    chess: null,
    draw: `/game/draw/${id}`,
    landlords: `/game/landlords/${id}`,
    undercover: `/game/undercover?roomId=${id}`,
    chineseChess: null,
  }[game];
  return (
    <span className={styles.invitation}>
      <span className={styles.invitationTitle}>
        <Gamepad2 size={18} aria-hidden="true" />
        {names[game]}游戏邀请
      </span>
      <span className={styles.roomId}>房间 {roomId}</span>
      {game === 'chess' ? (
        <>
          <span className={styles.invitationActions}>
            <Button
              onClick={() => navigate(`/game/piece?roomId=${id}&mode=join`)}
              aria-label={`加入五子棋房间 ${roomId}`}
            >
              加入房间
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(`/game/piece?roomId=${id}&mode=spectator`)}
              aria-label={`观战五子棋房间 ${roomId}`}
              disabled={!canWatch}
            >
              进入观战
            </Button>
          </span>
          {!canWatch && <span className={styles.roomId}>旧版房间暂不支持观战</span>}
        </>
      ) : target ? (
        <Button onClick={() => navigate(target)} aria-label={`进入${names[game]}房间 ${roomId}`}>
          进入房间
        </Button>
      ) : (
        <span className={styles.roomId}>中国象棋暂未接入</span>
      )}
    </span>
  );
}
