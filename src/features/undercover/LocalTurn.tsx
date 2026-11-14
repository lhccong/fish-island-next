import { useEffect, useState } from 'react';
import { Eye, Fingerprint } from 'lucide-react';
import { localWord, type LocalGame, type LocalAction } from '@/domain/undercover';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import styles from './Undercover.module.css';
export function LocalTurn({
  game,
  onAction,
}: {
  game: LocalGame;
  onAction: (action: LocalAction) => void;
}) {
  const [ready, setReady] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [text, setText] = useState('');
  const [target, setTarget] = useState('');
  const alive = game.players.filter((p) => p.alive);
  const current = alive[game.turn]!;
  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        setReveal(false);
        setReady(false);
      }
    };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  if (!ready)
    return (
      <div className={styles.handoff}>
        <Fingerprint size={52} strokeWidth={1.2} aria-hidden="true" />
        <p>请将设备交给</p>
        <h2>{current.name}</h2>
        <p>
          {game.turn + 1} / {alive.length} · 其他玩家请暂时移开视线
        </p>
        <Button
          onClick={() => {
            setReady(true);
            setReveal(game.phase === 'deal');
          }}
        >
          我是{current.name}，
          {game.phase === 'deal' ? '查看词语' : game.phase === 'vote' ? '开始投票' : '开始发言'}
        </Button>
      </div>
    );
  return (
    <div className={styles.turn}>
      <div className={styles.heading}>
        <h2>{current.name}</h2>
        <span>
          {game.turn + 1} / {alive.length}
        </span>
      </div>
      {game.phase !== 'vote' && (
        <div className={styles.secret}>
          {reveal ? (
            <>
              <small>你的词语</small>
              <strong>{localWord(game, current.id)}</strong>
              <Button variant="secondary" onClick={() => setReveal(false)}>
                隐藏词语
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setReveal(true)}>
              <Eye size={16} aria-hidden="true" />
              查看我的词语
            </Button>
          )}
        </div>
      )}
      {game.phase === 'deal' && (
        <div className={styles.actions}>
          <Button onClick={() => onAction({ type: 'next' })}>记住了，隐藏并继续</Button>
        </div>
      )}
      {game.phase === 'describe' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onAction({ type: 'describe', text });
          }}
        >
          <label className={styles.field}>
            描述你的词语
            <textarea
              value={text}
              maxLength={200}
              rows={3}
              placeholder="可直接口头描述，也可以记在这里"
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <div className={styles.actions}>
            <Button type="submit">发言结束</Button>
          </div>
        </form>
      )}
      {game.phase === 'vote' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (target) onAction({ type: 'vote', target });
          }}
        >
          <label className={styles.field}>
            你认为谁是卧底？
            <Select
              label="投票给谁"
              value={target}
              options={alive
                .filter((p) => p.id !== current.id)
                .map((p) => ({ value: p.id, label: p.name }))}
              onValueChange={setTarget}
            />
          </label>
          <p>提交后无法修改，全部投完才公布票数。</p>
          <div className={styles.actions}>
            <Button type="submit" disabled={!target}>
              确认投票并交接
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
