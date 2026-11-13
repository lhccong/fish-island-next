import { Switch } from '@/shared/ui/Switch';
import { useChatRealtime } from './realtime-context';
import styles from './ChatDisplaySettings.module.css';

export function ChatDisplaySettings() {
  const { avatarPreference } = useChatRealtime();
  return (
    <section aria-label="消息显示设置" className={styles.settings}>
      <div className={styles.setting}>
        <span>显示消息头像</span>
        <Switch
          label="显示消息头像"
          checked={avatarPreference.showAvatars}
          onCheckedChange={avatarPreference.change}
        />
      </div>
      {avatarPreference.notice && <p role="status">{avatarPreference.notice}</p>}
    </section>
  );
}
