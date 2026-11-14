import { useState } from 'react';
import type { UndercoverRoom } from '@/domain/undercover';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { Select } from '@/shared/ui/Select';
import type { RoomController } from './room-controller';
import styles from './Undercover.module.css';
export function RoomPlayers({
  room,
  userId,
  pending,
  controller,
}: {
  room: UndercoverRoom;
  userId: string;
  pending: boolean;
  controller: RoomController;
}) {
  const [target, setTarget] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [guess, setGuess] = useState('');
  const me = room.players.find((p) => p.id === userId);
  const voted = room.votes.some((v) => v.voterId === userId);
  const canVote = room.status === 'PLAYING' && me && !me.eliminated && !voted;
  return (
    <div>
      <ul className={styles.players}>
        {room.players.map((p, index) => (
          <li key={p.id}>
            <span>
              {index + 1}. {p.name}
              {p.id === userId && '（你）'}
              {p.id === room.creatorId && ' · 房主'}
            </span>
            <span>
              {p.eliminated ? '已出局' : room.status === 'PLAYING' ? `${p.votes} 票` : '已就位'}
            </span>
          </li>
        ))}
      </ul>
      {canVote && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (target) setConfirm(true);
          }}
        >
          <label className={styles.field}>
            投出你怀疑的玩家
            <Select
              label="联机投票目标"
              value={target}
              options={room.players
                .filter((p) => !p.eliminated && p.id !== userId)
                .map((p) => ({ value: p.id, label: p.name }))}
              onValueChange={setTarget}
              disabled={pending}
            />
          </label>
          <div className={styles.actions}>
            <Button type="submit" disabled={!target || pending}>
              提交投票
            </Button>
          </div>
        </form>
      )}
      {voted && room.status === 'PLAYING' && <p>本轮已投票，等待结算。</p>}
      {room.mode === 2 &&
        room.role === 'undercover' &&
        room.status === 'PLAYING' &&
        me &&
        !me.eliminated && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (guess.trim() && (await controller.guess(guess.trim()))) setGuess('');
            }}
          >
            <label className={styles.field}>
              猜出平民词（剩余 {me.guessesLeft} 次）
              <input
                aria-label="猜测平民词"
                required
                value={guess}
                maxLength={30}
                disabled={pending || !me.guessesLeft}
                onChange={(e) => setGuess(e.target.value)}
              />
            </label>
            <div className={styles.actions}>
              <Button type="submit" disabled={pending || !me.guessesLeft || !guess.trim()}>
                提交猜词
              </Button>
            </div>
          </form>
        )}
      {room.votes.length > 0 && (
        <details className={styles.rules}>
          <summary>本轮投票记录</summary>
          <ul className={styles.history}>
            {room.votes.map((v) => (
              <li key={v.voterId}>
                {v.voterName} → {v.targetName}
              </li>
            ))}
          </ul>
        </details>
      )}
      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        title="确认投票？"
        description={`本轮投给 ${room.players.find((p) => p.id === target)?.name ?? '所选玩家'}，提交后不能修改。`}
        showCloseAction={false}
      >
        <div className={styles.actions}>
          <Button variant="secondary" disabled={pending} onClick={() => setConfirm(false)}>
            取消
          </Button>
          <Button
            disabled={
              pending || !canVote || !room.players.some((p) => p.id === target && !p.eliminated)
            }
            onClick={async () => {
              if (await controller.vote(target)) {
                setTarget('');
                setConfirm(false);
              }
            }}
          >
            确认投票
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
