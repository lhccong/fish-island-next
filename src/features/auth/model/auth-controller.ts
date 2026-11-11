import { createStore } from 'zustand/vanilla';
import {
  AuthError,
  type AuthPort,
  type AuthUser,
  type LoginCredentials,
  type SessionToken,
  type SessionVault,
} from '@/domain/auth';

type Session =
  | { status: 'checking' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'error'; message: string };
interface AuthState {
  notice: string | null;
  session: Session;
  pending: 'login' | 'logout' | null;
}

export function createAuthController(service: AuthPort, vault: SessionVault) {
  const store = createStore<AuthState>(() => ({
    session: { status: 'checking' },
    pending: null,
    notice: null,
  }));
  let epoch = 0;
  let credential: SessionToken | null = null;
  let request: AbortController | null = null;
  let restoreTask: Promise<void> | null = null;

  function restore(force = false): Promise<void> {
    if (restoreTask && !force) return restoreTask;
    const version = ++epoch;
    request?.abort();
    const controller = new AbortController();
    request = controller;
    store.setState({ session: { status: 'checking' }, pending: null });
    const task = Promise.resolve().then(async () => {
      if (version !== epoch) return;
      try {
        const token = vault.read();
        if (!token) {
          credential = null;
          if (version === epoch) store.setState({ session: { status: 'anonymous' } });
          return;
        }
        const user = await service.current(token, controller.signal);
        if (version !== epoch) return;
        credential = token;
        store.setState({ session: { status: 'authenticated', user } });
      } catch (error) {
        if (version !== epoch) return;
        if (error instanceof AuthError && error.kind === 'unauthorized') {
          credential = null;
          try {
            vault.clear();
            store.setState({ session: { status: 'anonymous' } });
          } catch {
            store.setState({
              session: { status: 'error', message: '无法清除过期登录信息，请检查浏览器存储权限' },
            });
          }
        } else
          store.setState({
            session: {
              status: 'error',
              message:
                error instanceof AuthError
                  ? error.message
                  : '无法读取登录信息，请检查浏览器存储权限后重试',
            },
          });
      }
    });
    restoreTask = task;
    void task.finally(() => {
      if (restoreTask === task) restoreTask = null;
    });
    return task;
  }

  async function login(values: LoginCredentials, remember: boolean): Promise<boolean> {
    if (store.getState().pending) return false;
    const version = ++epoch;
    request?.abort();
    restoreTask = null;
    const controller = new AbortController();
    request = controller;
    store.setState({ pending: 'login' });
    try {
      const result = await service.login(values, controller.signal);
      if (version !== epoch) return false;
      try {
        vault.write(result.token, remember);
      } catch {
        throw new Error('无法保存登录信息，请检查浏览器存储权限');
      }
      credential = result.token;
      store.setState({ session: { status: 'authenticated', user: result.user }, notice: null });
      return true;
    } catch (error) {
      if (version !== epoch) return false;
      throw error;
    } finally {
      if (version === epoch) store.setState({ pending: null });
    }
  }

  async function logout(): Promise<boolean> {
    if (store.getState().pending) return false;
    const version = ++epoch;
    request?.abort();
    restoreTask = null;
    const token = credential;
    try {
      vault.clear();
    } catch {
      throw new Error('无法清除登录信息，请检查浏览器存储权限');
    }
    credential = null;
    store.setState({ session: { status: 'anonymous' }, pending: 'logout' });
    const controller = new AbortController();
    request = controller;
    try {
      if (token) await service.logout(token, controller.signal);
      return true;
    } catch (error) {
      return error instanceof AuthError && error.kind === 'unauthorized';
    } finally {
      if (version === epoch) store.setState({ pending: null });
    }
  }

  return {
    notify: (notice: string | null) => store.setState({ notice }),
    store,
    restore,
    login,
    logout,
    subscribe: (listener: () => void) => vault.subscribe(listener),
  };
}

export type AuthController = ReturnType<typeof createAuthController>;
