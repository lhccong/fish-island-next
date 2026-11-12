import { createStore } from 'zustand/vanilla';
import {
  AuthError,
  type AuthPort,
  type AuthUser,
  type LoginCredentials,
  type SessionToken,
  type SessionVault,
  type ProfileUpdate,
} from '@/domain/auth';

type Session =
  | { status: 'checking' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'error'; message: string };
interface AuthState {
  emailCodeRetryAt: number;
  emailCodeTarget: string;
  notice: string | null;
  session: Session;
  pending: 'login' | 'logout' | 'profile' | null;
}

export function createAuthController(service: AuthPort, vault: SessionVault) {
  const store = createStore<AuthState>(() => ({
    emailCodeRetryAt: 0,
    emailCodeTarget: '',
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
    store.setState({
      session: { status: 'anonymous' },
      pending: 'logout',
      emailCodeRetryAt: 0,
      emailCodeTarget: '',
    });
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

  async function mutateProfile(
    change: (token: SessionToken, signal: AbortSignal) => Promise<void>,
    patch: Partial<AuthUser>,
  ): Promise<boolean> {
    const session = store.getState().session;
    if (store.getState().pending || session.status !== 'authenticated' || !credential) return false;
    const version = epoch;
    const controller = new AbortController();
    request = controller;
    store.setState({ pending: 'profile' });
    try {
      await change(credential, controller.signal);
      if (version !== epoch) return false;
      store.setState({
        session: {
          status: 'authenticated',
          user: { ...session.user, ...patch },
        },
      });
      try {
        const user = await service.current(credential, controller.signal);
        if (version === epoch) store.setState({ session: { status: 'authenticated', user } });
      } catch (error) {
        if (error instanceof AuthError && error.kind === 'unauthorized') throw error;
        if (version === epoch)
          store.setState({ notice: '资料已保存，但重新读取失败，请稍后重新打开页面确认。' });
      }
      return version === epoch;
    } catch (error) {
      if (version !== epoch) return false;
      if (error instanceof AuthError && error.kind === 'unauthorized') {
        store.setState({ notice: error.message });
        await restore(true);
      }
      throw error;
    } finally {
      if (version === epoch) store.setState({ pending: null });
    }
  }

  function updateProfile(values: ProfileUpdate) {
    return mutateProfile((token, signal) => service.updateProfile(values, token, signal), {
      ...values,
      avatarUrl: values.avatarUrl || null,
    });
  }

  async function withCredential<T>(action: (token: SessionToken) => Promise<T>): Promise<T> {
    if (!credential) throw new AuthError('unauthorized', '请先登录');
    const version = epoch;
    try {
      const result = await action(credential);
      if (version !== epoch) throw new AuthError('unauthorized', '账号已改变，请重新打开资料');
      return result;
    } catch (error) {
      if (version === epoch && error instanceof AuthError && error.kind === 'unauthorized') {
        store.setState({ notice: error.message });
        await restore(true);
      }
      throw error;
    }
  }

  async function uploadProfileImage(file: File, signal: AbortSignal): Promise<string> {
    if (!credential) throw new AuthError('unauthorized', '请先登录');
    const version = epoch;
    try {
      const url = await service.uploadProfileImage(file, credential, signal);
      if (version !== epoch) throw new AuthError('unauthorized', '账号已改变，请重新打开资料');
      return url;
    } catch (error) {
      if (version === epoch && error instanceof AuthError && error.kind === 'unauthorized') {
        store.setState({ notice: error.message });
        await restore(true);
      }
      throw error;
    }
  }

  return {
    titles: (signal: AbortSignal) => withCredential((token) => service.titles(token, signal)),
    membership: (signal: AbortSignal) =>
      withCredential((token) => service.membership(token, signal)),
    sendEmailCode: async (email: string, signal: AbortSignal) => {
      if (store.getState().emailCodeRetryAt > Date.now())
        throw new AuthError('rejected', '请稍后再获取验证码');
      await withCredential((token) => service.sendEmailCode(email, token, signal));
      store.setState({ emailCodeRetryAt: Date.now() + 60_000, emailCodeTarget: email });
    },
    bindEmail: (email: string, code: string) =>
      mutateProfile((token, signal) => service.bindEmail(email, code, token, signal), { email }),
    setTitle: (titleId: string) =>
      mutateProfile((token, signal) => service.setTitle(titleId, token, signal), { titleId }),
    updateProfile,
    uploadProfileImage,
    notify: (notice: string | null) => store.setState({ notice }),
    store,
    restore,
    login,
    logout,
    subscribe: (listener: () => void) => vault.subscribe(listener),
  };
}

export type AuthController = ReturnType<typeof createAuthController>;
