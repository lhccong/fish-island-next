import { useStore } from 'zustand';
import { useChatRealtime } from './realtime-context';
import styles from './MessageStream.module.css';

const labels = {
  connecting: '正在连接聊天室…',
  connected: '已连接 · HTTP 发送 / 实时接收',
  reconnecting: '连接中断，正在自动重连…',
  offline: '网络已离线，恢复网络后自动连接',
  unauthorized: '连接认证失败，请重新登录',
  closed: '聊天连接已关闭',
};
export function ConnectionStatus() {
  const { controller } = useChatRealtime();
  const state = useStore(controller.store, (value) => value.connection);
  return (
    <span className={styles.connection} role="status" aria-label="聊天室连接状态">
      {labels[state]}
    </span>
  );
}
