import { createGomokuController } from '@/features/gomoku';
import type { GomokuSocialPort } from '@/domain/gomoku';
import { createChatSender } from '@/infrastructure/chat';
import { createBrowserSessionVault } from '@/infrastructure/auth';
import { gameRealtime } from '@/app/config/game-realtime';
import { authController } from '@/app/config/auth';
import { chatRealtime } from '@/app/config/chat';
import { apiBaseUrl } from '@/app/config/api';

export const gomokuController = createGomokuController(gameRealtime.port);
const vault = createBrowserSessionVault(apiBaseUrl);
const sender = createChatSender(
  apiBaseUrl,
  () => vault.read(),
  () => {
    void authController.restore(true);
  },
);
const message = (value: { id: string; senderName: string; content: string }) => ({
  id: value.id,
  sender: value.senderName,
  content: value.content,
});
export const gomokuSocial: GomokuSocialPort = {
  subscribe: (listener) => chatRealtime.subscribeIncoming((value) => listener(message(value))),
  async send(content, signal, clientMessageId = crypto.randomUUID()) {
    if (authController.store.getState().session.status !== 'authenticated')
      throw new Error('请登录后发送消息');
    return message(await sender.send({ content, clientMessageId }, signal));
  },
};
const syncAccount = () => {
  const session = authController.store.getState().session;
  if (session.status === 'authenticated') gomokuController.start(session.user.id);
  else gomokuController.reset();
};
syncAccount();
const unsubscribe = authController.store.subscribe(syncAccount);
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    unsubscribe();
    gomokuController.dispose();
  });
