import { useEffect, useRef, useState } from 'react';
import type { BuiltinSkinId, ColorMode } from '@/skins/builtin';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { connectGame, readTheme } from './game-frame';
import styles from './DarkRoom.module.css';

interface DarkRoomProps {
  skinId: BuiltinSkinId;
  colorMode: ColorMode;
  onEscape?: (() => void) | undefined;
}

function GameFrame({
  skinId,
  colorMode,
  onEscape,
  onRetry,
}: DarkRoomProps & { onRetry: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const connection = useRef<ReturnType<typeof connectGame> | null>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    if (status !== 'loading') return;
    const timeout = window.setTimeout(() => {
      connection.current?.close();
      setStatus('error');
    }, 12_000);
    return () => window.clearTimeout(timeout);
  }, [status]);

  useEffect(() => () => connection.current?.close(), []);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => connection.current?.setTheme(readTheme()));
    return () => cancelAnimationFrame(frameId);
  }, [skinId, colorMode]);

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 760px)');
    const update = () => connection.current?.setTheme(readTheme());
    mobile.addEventListener('change', update);
    return () => mobile.removeEventListener('change', update);
  }, []);

  const start = () => {
    const game = frame.current?.contentWindow;
    if (!game) return;
    connection.current?.close();
    connection.current = connectGame(game, {
      ready: () => setStatus('ready'),
      failed: () => {
        connection.current?.close();
        setStatus('error');
      },
      reloading: () => setStatus('loading'),
      escape: () => onEscape?.(),
      storageError: () => setStorageError(true),
    });
  };

  return (
    <div className={styles.game}>
      {storageError && (
        <p className={styles.storageError} role="status">
          浏览器无法保存进度。离开前可在游戏内导出存档码。
        </p>
      )}
      {status !== 'error' && (
        <iframe
          ref={frame}
          className={styles.frame}
          data-ready={status === 'ready'}
          title="小黑屋模拟器"
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          src={`${import.meta.env.BASE_URL}dark-room/index.html?lang=zh_cn&ignorebrowser=true`}
          onLoad={start}
        />
      )}
      {status === 'loading' && <LoadingIndicator>正在打开小黑屋…</LoadingIndicator>}
      {status === 'error' && (
        <div className={styles.error} role="alert">
          <p>小黑屋未能启动。</p>
          <Button onClick={onRetry}>重试</Button>
        </div>
      )}
    </div>
  );
}

export function DarkRoom(props: DarkRoomProps) {
  const [attempt, setAttempt] = useState(0);
  return <GameFrame {...props} key={attempt} onRetry={() => setAttempt((value) => value + 1)} />;
}
