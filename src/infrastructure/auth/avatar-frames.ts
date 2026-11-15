import { AuthError, type AuthPort, type SessionToken } from '@/domain/auth';
import { asRecord, safeImageUrl } from './decode';

type Request = (
  path: string,
  method: 'GET' | 'POST',
  signal: AbortSignal,
  token?: SessionToken,
  body?: object,
) => Promise<unknown>;

export function avatarFrameMethods(
  request: Request,
): Pick<AuthPort, 'avatarFrames' | 'exchangeAvatarFrame' | 'setAvatarFrame'> {
  const base = '/api/avatar/frame';
  async function write(action: string, id: string, token: SessionToken, signal: AbortSignal) {
    if (!/^(?:[1-9]\d*|-1)$/.test(id) || (action === 'exchange' && id === '-1'))
      throw new AuthError('rejected', '请选择有效的头像框');
    if (
      (await request(
        `${base}/${action}?frameId=${encodeURIComponent(id)}`,
        'POST',
        signal,
        token,
      )) !== true
    )
      throw new AuthError('rejected', '服务器未确认头像框操作成功');
  }
  return {
    async avatarFrames(page, token, signal) {
      const data = asRecord(
        await request(`${base}/list/page/vo`, 'POST', signal, token, {
          current: page,
          pageSize: 12,
        }),
      );
      const total =
        typeof data.total === 'string' && /^(?:0|[1-9]\d*)$/.test(data.total)
          ? Number(data.total)
          : data.total;
      if (
        !Array.isArray(data.records) ||
        typeof total !== 'number' ||
        !Number.isSafeInteger(total) ||
        total < 0
      )
        throw new AuthError('invalid-response', '头像框列表格式异常，请重试');
      const items = data.records.map((value: unknown) => {
        const frame = asRecord(value);
        if (
          (typeof frame.id !== 'string' &&
            !(typeof frame.id === 'number' && Number.isSafeInteger(frame.id))) ||
          !/^[1-9]\d*$/.test(String(frame.id)) ||
          typeof frame.name !== 'string' ||
          typeof frame.points !== 'number' ||
          !Number.isSafeInteger(frame.points) ||
          frame.points < 0 ||
          typeof frame.hasOwned !== 'boolean'
        )
          throw new AuthError('invalid-response', '头像框资料不完整，请重试');
        return {
          id: String(frame.id),
          name: frame.name || '头像框',
          url: safeImageUrl(frame.url),
          points: frame.points,
          owned: frame.hasOwned,
        };
      });
      return { items, total };
    },
    exchangeAvatarFrame: (id, token, signal) => write('exchange', id, token, signal),
    setAvatarFrame: (id, token, signal) => write('set', id, token, signal),
  };
}
