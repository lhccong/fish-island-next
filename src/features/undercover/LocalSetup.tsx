import { useState } from 'react';
import { createLocalGame, wordPairs, type LocalGame } from '@/domain/undercover';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import styles from './Undercover.module.css';
export function LocalSetup({ onStart }: { onStart: (game: LocalGame) => void }) {
  const [names, setNames] = useState(() => Array.from({ length: 6 }, (_, i) => `玩家${i + 1}`));
  const [spies, setSpies] = useState(1);
  const [custom, setCustom] = useState(false);
  const [civilian, setCivilian] = useState('');
  const [undercover, setUndercover] = useState('');
  const [error, setError] = useState('');
  return (
    <form
      className={styles.panel}
      onSubmit={(event) => {
        event.preventDefault();
        try {
          const pair = custom
            ? ([civilian, undercover] as const)
            : wordPairs[Math.floor(Math.random() * wordPairs.length)]!;
          onStart(createLocalGame(names, spies, pair));
        } catch (error) {
          setError(error instanceof Error ? error.message : '无法开始，请检查设置');
        }
      }}
    >
      <div className={styles.heading}>
        <div>
          <h3>围坐一桌，藏好你的词</h3>
          <p>3–20 人共用一台设备，依次查看词语、发言和投票。</p>
        </div>
      </div>
      <div className={styles.settings}>
        <label>
          玩家人数
          <Select
            label="玩家人数"
            value={String(names.length)}
            options={Array.from({ length: 18 }, (_, i) => ({
              value: String(i + 3),
              label: `${i + 3} 人`,
            }))}
            onValueChange={(value) => {
              const count = Number(value);
              setNames((old) => Array.from({ length: count }, (_, i) => old[i] ?? `玩家${i + 1}`));
              setSpies((old) => Math.min(old, Math.floor((count - 1) / 2)));
            }}
          />
        </label>
        <label>
          卧底人数
          <Select
            label="卧底人数"
            value={String(spies)}
            options={Array.from({ length: Math.floor((names.length - 1) / 2) }, (_, i) => ({
              value: String(i + 1),
              label: `${i + 1} 人`,
            }))}
            onValueChange={(value) => setSpies(Number(value))}
          />
        </label>
        <label>
          词语来源
          <Select
            label="词语来源"
            value={custom ? 'custom' : 'random'}
            options={[
              { value: 'random', label: '随机词对' },
              { value: 'custom', label: '自定义词对' },
            ]}
            onValueChange={(value) => setCustom(value === 'custom')}
          />
        </label>
      </div>
      {custom && (
        <div className={styles.settings}>
          <label>
            平民词
            <input
              value={civilian}
              maxLength={30}
              required
              onChange={(e) => setCivilian(e.target.value)}
            />
          </label>
          <label>
            卧底词
            <input
              value={undercover}
              maxLength={30}
              required
              onChange={(e) => setUndercover(e.target.value)}
            />
          </label>
          <p>自定义词对建议由不参与游戏的人设置。</p>
        </div>
      )}
      <fieldset className={styles.names}>
        <legend>玩家昵称</legend>
        {names.map((name, index) => (
          <label key={index}>
            {index + 1}
            <input
              aria-label={`玩家${index + 1}昵称`}
              value={name}
              maxLength={20}
              required
              onChange={(event) =>
                setNames((old) => old.map((n, i) => (i === index ? event.target.value : n)))
              }
            />
          </label>
        ))}
      </fieldset>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <Button type="submit">开始发牌</Button>
      </div>
      <details className={styles.rules}>
        <summary>游戏规则</summary>
        <p>
          多数人拿到相同的平民词，少数人拿到相近的卧底词。只看词语，不会提前揭示身份。描述时不能直接说出词语，每人一票且不能投自己；最高票唯一的玩家出局，平票则无人出局，继续下一轮。
        </p>
        <p>找出全部卧底，平民获胜；存活卧底人数达到平民人数，卧底获胜。关闭页面会结束本地对局。</p>
      </details>
    </form>
  );
}
