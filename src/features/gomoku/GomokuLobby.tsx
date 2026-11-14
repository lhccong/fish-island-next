import { useId, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import type { GomokuController } from './controller';
import styles from './Gomoku.module.css';

export function GomokuLobby({
  controller,
  busy,
  connected,
}: {
  controller: GomokuController;
  busy: boolean;
  connected: boolean;
}) {
  const [room, setRoom] = useState('');
  const roomInputId = useId();
  return (
    <div className={styles.lobby}>
      <div className={styles.intro}>
        <span className={styles.eyebrow}>五子棋</span>
        <h2>
          一人一手，
          <br />
          连起片刻闲暇。
        </h2>
        <p>创建房间邀请岛友，或输入房间号加入对局。</p>
      </div>
      <div className={styles.lobbyActions}>
        <Button onClick={() => controller.create()} disabled={busy || !connected}>
          {busy ? '正在准备房间…' : '创建联机房间'}
        </Button>
        <form
          className={styles.join}
          onSubmit={(event) => {
            event.preventDefault();
            controller.join(room);
          }}
        >
          <label htmlFor={roomInputId}>房间号</label>
          <div>
            <input
              id={roomInputId}
              value={room}
              onChange={(event) => setRoom(event.target.value)}
              maxLength={64}
              placeholder="输入好友的房间号"
              autoComplete="off"
              disabled={busy}
            />
            <Button variant="secondary" type="submit" disabled={busy || !connected || !room.trim()}>
              加入房间
            </Button>
          </div>
        </form>
        <div className={styles.practice}>
          <h3>先练一局</h3>
          <p>与电脑练习，自由五子棋，无禁手。</p>
          <div className={styles.actions}>
            <Button variant="secondary" disabled={busy} onClick={() => controller.single('black')}>
              执黑先手
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => controller.single('white')}>
              执白后手
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
