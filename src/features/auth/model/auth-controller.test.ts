import { expect, it, vi } from 'vitest';
import { AuthError, type AuthPort, type SessionToken, type SessionVault } from '@/domain/auth';
import { createAuthController } from './auth-controller';

const user = { id: '123', name: '测试用户', avatarUrl: null, role: 'user' };
const token = { name: 'test-session', value: 'synthetic-test-value' };
const profileUpdate = {
  name: '新岛友',
  avatarUrl: 'https://example.com/new.png',
  coverUrl: '',
  profile: '新的简介',
};

it('synchronizes independent email and title operations without replacing the session lifecycle', async () => {
  const { controller, service } = setup();
  await controller.restore();
  const states: string[] = [];
  controller.store.subscribe((state) => states.push(state.session.status));
  await controller.sendEmailCode('synthetic@example.com', new AbortController().signal);
  expect(controller.store.getState().emailCodeRetryAt).toBeGreaterThan(Date.now());
  await expect(
    controller.sendEmailCode('synthetic@example.com', new AbortController().signal),
  ).rejects.toThrow('稍后');
  expect(service.sendEmailCode).toHaveBeenCalledTimes(1);
  vi.mocked(service.current).mockResolvedValueOnce({ ...user, email: 'synthetic@example.com' });
  expect(await controller.bindEmail('synthetic@example.com', '654321')).toBe(true);
  expect(controller.store.getState().session).toMatchObject({
    user: { email: 'synthetic@example.com' },
  });
  vi.mocked(service.current).mockResolvedValueOnce({ ...user, titleId: '7' });
  expect(await controller.setTitle('7')).toBe(true);
  expect(service.setTitle).toHaveBeenCalledWith('7', token, expect.any(AbortSignal));
  expect(states).not.toContain('checking');
  await controller.logout();
  expect(controller.store.getState().emailCodeRetryAt).toBe(0);
});
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
    titles: vi.fn().mockResolvedValue([]),
    membership: vi.fn().mockResolvedValue(null),
    sendEmailCode: vi.fn().mockResolvedValue(undefined),
    bindEmail: vi.fn().mockResolvedValue(undefined),
    setTitle: vi.fn().mockResolvedValue(undefined),
    login: vi.fn().mockResolvedValue({ user, token }),
    current: vi.fn().mockResolvedValue(user),
    logout: vi.fn().mockResolvedValue(undefined),
    updateProfile: vi.fn().mockResolvedValue(undefined),
    uploadProfileImage: vi.fn().mockResolvedValue('https://example.com/avatar.png'),
  };
  return { controller: createAuthController(service, vault), vault, service };
}

it('updates the session in place, reads back canonical profile and blocks duplicate saves', async () => {
  const { controller, service } = setup();
  await controller.restore();
  const states: string[] = [];
  controller.store.subscribe((state) => states.push(state.session.status));
  vi.mocked(service.current).mockResolvedValueOnce({ ...user, ...profileUpdate });
  expect(
    await Promise.all([
      controller.updateProfile(profileUpdate),
      controller.updateProfile(profileUpdate),
    ]),
  ).toEqual([true, false]);
  expect(service.updateProfile).toHaveBeenCalledTimes(1);
  expect(service.updateProfile).toHaveBeenCalledWith(profileUpdate, token, expect.any(AbortSignal));
  expect(controller.store.getState().session).toMatchObject({ user: profileUpdate });
  expect(states).not.toContain('checking');
  expect(controller.store.getState().pending).toBeNull();
});

it('keeps confirmed changes if readback fails, and does not misreport a saved profile as failed', async () => {
  const { controller, service } = setup();
  await controller.restore();
  vi.mocked(service.current).mockRejectedValueOnce(new AuthError('network', '读取失败'));
  expect(await controller.updateProfile(profileUpdate)).toBe(true);
  expect(controller.store.getState().session).toMatchObject({ user: profileUpdate });
  expect(controller.store.getState().notice).toContain('资料已保存');
});

it('discards an upload response after logout', async () => {
  const { controller, service } = setup();
  await controller.restore();
  let complete: ((url: string) => void) | undefined;
  vi.mocked(service.uploadProfileImage).mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const upload = controller.uploadProfileImage(
    new File(['image'], 'avatar.png', { type: 'image/png' }),
    new AbortController().signal,
  );
  const assertion = expect(upload).rejects.toThrow('账号已改变');
  await controller.logout();
  complete?.('https://example.com/upload.png');
  await assertion;
  expect(controller.store.getState().session.status).toBe('anonymous');
});

it('keeps existing profile on rejection and clears an expired session', async () => {
  const { controller, service } = setup();
  await controller.restore();
  vi.mocked(service.updateProfile).mockRejectedValueOnce(new AuthError('rejected', '本月已修改'));
  await expect(controller.updateProfile(profileUpdate)).rejects.toThrow('本月已修改');
  expect(controller.store.getState().session).toEqual({ status: 'authenticated', user });
  vi.mocked(service.updateProfile).mockRejectedValueOnce(new AuthError('unauthorized', '过期'));
  vi.mocked(service.current).mockRejectedValueOnce(new AuthError('unauthorized', '过期'));
  await expect(controller.updateProfile(profileUpdate)).rejects.toThrow('过期');
  expect(controller.store.getState().session.status).toBe('anonymous');
});

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
