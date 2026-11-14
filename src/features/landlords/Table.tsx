import { useEffect, useState } from 'react';
import type { TableState } from '@/domain/landlords';
import { Button } from '@/shared/ui/Button';
import { Cards } from './Cards';
import { Hand } from './Hand';
import styles from './Landlords.module.css';
export function Table({
  table,
  userId,
  pending,
  connected,
  onAction,
}: {
  table: TableState;
  userId: string;
  pending: boolean;
  connected: boolean;
  onAction: (command: string, body?: Record<string, unknown>) => void;
}) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const me = table.players.find((p) => p.id === userId);
  const myTurn = table.currentId === userId && !me?.robot;
  const waiting = ['waiting', 'ready', 'ending'].includes(table.phase);
  const disabled = pending || !connected;
  const labels: Record<string, string> = {
    waiting: '等待准备',
    ready: '等待准备',
    dealing: '正在发牌',
    robbing: '叫地主',
    landlord_confirmed: '地主已确定',
    playing: '出牌中',
    ending: '本局结束',
    closed: '房间已关闭',
  };
  return (
    <div className={styles.table}>
      <div className={styles.phaseHeader} data-active={myTurn}>
        <strong>
          {labels[table.phase] ?? '同步中'}
          {me && (
            <small>
              {' '}
              · 我
              {userId === table.landlordId
                ? '是地主'
                : table.landlordId
                  ? '是农民'
                  : me.owner
                    ? '是房主'
                    : '在牌桌'}
            </small>
          )}
        </strong>
        <span>{table.deadline > now ? `${Math.ceil((table.deadline - now) / 1000)} 秒` : ''}</span>
      </div>
      <div className={styles.arena}>
        <div className={styles.seats}>
          {table.players
            .filter((p) => p.id !== userId)
            .map((p) => (
              <section key={p.id} className={styles.seat} data-current={p.id === table.currentId}>
                <div className={styles.row}>
                  <h3>
                    {p.name}
                    {p.id === userId ? '（我）' : ''}
                  </h3>
                  <strong>
                    {p.id === table.landlordId
                      ? '地主'
                      : table.landlordId
                        ? '农民'
                        : p.owner
                          ? '房主'
                          : '牌友'}
                  </strong>
                </div>
                <p>
                  {p.online ? (p.robot ? '托管中' : p.ready ? '已准备' : '在线') : '离线'} · 剩余{' '}
                  {p.count ?? '—'} 张
                </p>
                <Cards cards={p.played} />
              </section>
            ))}
        </div>
        <section className={styles.center} aria-label="底牌">
          <span className={styles.muted}>底牌</span>
          {table.bottom.length ? (
            <Cards cards={table.bottom} />
          ) : (
            <div className={styles.cardBacks} aria-label="底牌尚未公开">
              <span>♠</span>
              <span>♥</span>
              <span>♣</span>
            </div>
          )}
          <p>
            {myTurn
              ? table.action === 'ROB'
                ? '轮到你叫分'
                : '轮到你出牌'
              : table.currentId
                ? `等待 ${table.players.find((p) => p.id === table.currentId)?.name ?? '牌友'} 操作`
                : waiting
                  ? '准备好后，房主即可开始'
                  : '等待服务端同步回合'}
          </p>
          {Boolean(me?.played.length) && (
            <div aria-label="我的出牌">
              <small className={styles.muted}>我的出牌</small>
              <Cards cards={me?.played ?? []} />
            </div>
          )}
        </section>
      </div>
      {table.result && (
        <section className={styles.result} aria-label="本局结算">
          <h2>{table.result.message}</h2>
          {table.result.players.map((p) => (
            <p key={p.id}>
              {p.name} · {p.winner ? '获胜' : '本局结束'}
              {p.score === null ? '' : ` · ${p.score > 0 ? '+' : ''}${p.score} 分`}
            </p>
          ))}
        </section>
      )}
      <Hand
        cards={table.hand}
        enabled={connected && myTurn && table.phase === 'playing' && table.action === 'PLAY'}
        pending={pending}
        onPlay={(pokers) => onAction('gamePlayCards', { pokers })}
      >
        {waiting && (
          <Button disabled={disabled || !me} onClick={() => onAction('gameReady')}>
            {me?.ready ? '取消准备' : '准备'}
          </Button>
        )}
        {waiting && (me?.owner || table.ownerId === userId) && (
          <Button
            disabled={disabled || table.players.length < 3 || !table.players.every((p) => p.ready)}
            onClick={() => onAction('gameStart')}
          >
            开始游戏
          </Button>
        )}
        {table.phase === 'robbing' &&
          table.options.map((o) => (
            <Button
              key={o.value}
              variant={o.value === 0 ? 'secondary' : 'primary'}
              disabled={disabled || !myTurn || !o.enabled}
              onClick={() => onAction('gameRobLandlord', { action: o.value })}
            >
              {o.name || (o.value ? `${o.value} 分` : '不叫')}
            </Button>
          ))}
        {table.phase === 'playing' && (
          <Button
            variant="secondary"
            disabled={disabled || !myTurn || !table.canPass}
            onClick={() => onAction('gamePass')}
          >
            不出
          </Button>
        )}
        {!waiting && me && (
          <Button
            variant="secondary"
            disabled={disabled}
            onClick={() => onAction(me.robot ? 'gameCancelRobot' : 'gameSetRobot')}
          >
            {me.robot ? '取消托管' : '开启托管'}
          </Button>
        )}
      </Hand>
    </div>
  );
}
