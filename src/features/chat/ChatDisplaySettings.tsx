import { Switch } from '@/shared/ui/Switch';
import { useChatRealtime } from './realtime-context';
import styles from './ChatDisplaySettings.module.css';

export function ChatDisplaySettings() {
  const { avatarPreference, imagePreference } = useChatRealtime();
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
      <div className={styles.setting}>
        <span>默认不渲染图片</span>
        <Switch
          label="默认不渲染图片"
          checked={imagePreference.deferImages}
          onCheckedChange={imagePreference.change}
        />
      </div>
      <p>开启后，点击消息中的图片占位按钮才加载图片。</p>
      {imagePreference.notice && <p role="status">{imagePreference.notice}</p>}
    </section>
  );
}
