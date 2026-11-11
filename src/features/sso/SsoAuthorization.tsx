import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Globe, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { AuthError, type AuthUser } from '@/domain/auth';
import type { AuthorizationRequest, SsoApplication, SsoPort } from '@/domain/sso';
import styles from './SsoAuthorization.module.css';

interface Props {
  request: AuthorizationRequest;
  user: AuthUser;
  service: SsoPort;
  onExpired: () => void;
  onAllow: (url: string) => void;
  onDeny: () => void;
}
type ApplicationState =
  | { status: 'loading' }
  | { status: 'ready'; app: SsoApplication | null }
  | { status: 'error'; message: string };

export function SsoAuthorization({ request, user, service, onExpired, onAllow, onDeny }: Props) {
  const [application, setApplication] = useState<ApplicationState>({ status: 'loading' });
  const [expanded, setExpanded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submission = useRef<AbortController | null>(null);
  const valid = !!request.clientId && !!request.redirectUri;
  const clientId = request.clientId;
  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    void service.application(clientId, controller.signal).then(
      (app) => {
        if (!controller.signal.aborted) setApplication({ status: 'ready', app });
      },
      (reason: unknown) => {
        if (controller.signal.aborted) return;
        if (reason instanceof AuthError && reason.kind === 'unauthorized') onExpired();
        else
          setApplication({
            status: 'error',
            message: reason instanceof Error ? reason.message : '加载应用信息失败',
          });
      },
    );
    return () => controller.abort();
  }, [service, clientId, valid, attempt, onExpired]);
  useEffect(
    () => () => {
      submission.current?.abort();
    },
    [],
  );

  async function allow() {
    if (!valid || submission.current) return;
    const controller = new AbortController();
    submission.current = controller;
    setPending(true);
    setError(null);
    try {
      const url = await service.authorize(request, controller.signal);
      if (!controller.signal.aborted) onAllow(url);
    } catch (reason) {
      if (controller.signal.aborted) return;
      if (reason instanceof AuthError && reason.kind === 'unauthorized') onExpired();
      else setError(reason instanceof Error ? reason.message : '授权请求失败');
    } finally {
      if (!controller.signal.aborted) {
        submission.current = null;
        setPending(false);
      }
    }
  }

  const app = application.status === 'ready' ? application.app : null;
  return (
    <main className={styles.container}>
      <div className={styles.lockIcon}>
        <LockKeyhole size={34} strokeWidth={1.6} aria-hidden="true" />
      </div>
      <h1 className={styles.appName}>{app?.name || request.clientId || '第三方应用'}</h1>
      <p className={styles.subTitle}>请求访问你的摸鱼岛账户</p>
      {!valid ? (
        <div className={styles.infoCard} role="alert">
          缺少必要的授权参数
        </div>
      ) : (
        <>
          <div className={styles.userCard}>
            {user.avatarUrl ? (
              <img className={styles.avatar} src={user.avatarUrl} alt="" />
            ) : (
              <span className={styles.avatar}>
                <UserRound size={24} aria-hidden="true" />
              </span>
            )}
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userHandle}>以 @{user.name} 的身份授权</span>
            </div>
          </div>
          <section className={styles.infoCard} aria-label="应用信息与权限">
            <p className={styles.sectionTitle}>应用信息</p>
            {application.status === 'loading' && <p role="status">正在加载应用信息…</p>}
            {application.status === 'error' && (
              <div role="alert">
                <p>{application.message}</p>
                <button
                  className={styles.retry}
                  onClick={() => {
                    setApplication({ status: 'loading' });
                    setAttempt(attempt + 1);
                  }}
                >
                  重试加载应用信息
                </button>
              </div>
            )}
            {application.status === 'ready' && !app && <p role="status">暂无应用公开信息</p>}
            <div className={styles.infoItem}>
              <Globe className={styles.infoIcon} size={14} aria-hidden="true" />
              <span className={styles.infoLink}>{app?.website || request.redirectUri}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoIcon}>○</span>
              <span>{app?.name || request.clientId}</span>
            </div>
            {app?.description && (
              <div className={styles.infoItem}>
                <ShieldCheck className={styles.infoIcon} size={14} aria-hidden="true" />
                <span>{app.description}</span>
              </div>
            )}
            <div className={styles.divider} />
            <p className={styles.sectionTitle}>将获取以下权限</p>
            <button
              className={styles.scopeItem}
              aria-expanded={expanded}
              aria-controls="sso-scope-detail"
              onClick={() => setExpanded(!expanded)}
            >
              <UserRound size={16} aria-hidden="true" />
              <span className={styles.scopeText}>
                获取你的用户<strong>基本信息</strong>
              </span>
              <span className={styles.arrowIcon} data-expanded={expanded}>
                <ChevronDown size={12} aria-hidden="true" />
              </span>
            </button>
            {expanded && (
              <div id="sso-scope-detail" className={styles.scopeDetail}>
                <div>· 用户名</div>
                <div>· 头像</div>
                <div>· 用户 ID</div>
              </div>
            )}
          </section>
        </>
      )}
      <div className={styles.btnWrap}>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {valid && (
          <button
            className={styles.allowBtn}
            disabled={pending}
            onClick={() => {
              void allow();
            }}
          >
            {pending ? '正在授权…' : '允许'}
          </button>
        )}
        <button
          className={styles.denyBtn}
          onClick={() => {
            submission.current?.abort();
            onDeny();
          }}
        >
          拒绝
        </button>
      </div>
    </main>
  );
}
