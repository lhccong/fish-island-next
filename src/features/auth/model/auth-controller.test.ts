import { expect, it, vi } from 'vitest';
import { AuthError, type AuthPort, type SessionToken, type SessionVault } from '@/domain/auth';
import { createAuthController } from './auth-controller';

const user = { id: '123', name: '测试用户', avatarUrl: null, role: 'user' };
const token = { name: 'test-session', value: 'synthetic-test-value' };
function setup(initial: SessionToken | null = token) {
  let cached = initial;
  const vault: SessionVault = {
    read: () => cached,
    write: vi.fn((value) => {
      cached = value;
    }),
    clear: vi.fn(() => {
      cached = null;
    }),
    subscribe: () => () => {},
  };
  const service: AuthPort = {
    login: vi.fn().mockResolvedValue({ user, token }),
    current: vi.fn().mockResolvedValue(user),
    logout: vi.fn().mockResolvedValue(undefined),
  };
  return { controller: createAuthController(service, vault), vault, service };
}

it('deduplicates initialization and restores the user', async () => {
  const { controller, service } = setup();
  await Promise.all([controller.restore(), controller.restore()]);
  expect(service.current).toHaveBeenCalledTimes(1);
  expect(controller.store.getState().session).toEqual({ status: 'authenticated', user });
});

it('retains credentials on network failure but clears an expired session', async () => {
  const { controller, service, vault } = setup();
  vi.mocked(service.current).mockRejectedValueOnce(new AuthError('network', '网络异常'));
  await controller.restore();
  expect(controller.store.getState().session).toMatchObject({ status: 'error' });
  expect(vault.clear).not.toHaveBeenCalled();
  vi.mocked(service.current).mockRejectedValueOnce(new AuthError('unauthorized', '过期'));
  await controller.restore();
  expect(vault.clear).toHaveBeenCalledTimes(1);
  expect(controller.store.getState().session).toEqual({ status: 'anonymous' });
});

it('does not let a delayed restore overwrite logout', async () => {
  const { controller, service } = setup();
  let finish: ((value: typeof user) => void) | undefined;
  vi.mocked(service.current).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const restore = controller.restore();
  await Promise.resolve();
  await controller.logout();
  finish?.(user);
  await restore;
  expect(controller.store.getState().session).toEqual({ status: 'anonymous' });
});

it('persists successful login and clears local state even when remote logout fails', async () => {
  const { controller, service, vault } = setup(null);
  await controller.restore();
  await controller.login({ account: 'test-account', password: 'test-password' }, false);
  expect(vault.write).toHaveBeenCalledWith(token, false);
  vi.mocked(service.logout).mockRejectedValue(new AuthError('network', '网络异常'));
  expect(await controller.logout()).toBe(false);
  expect(vault.clear).toHaveBeenCalled();
  expect(controller.store.getState().session).toEqual({ status: 'anonymous' });
});
