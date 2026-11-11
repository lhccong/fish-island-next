import { X } from 'lucide-react';
import { useAuth } from './use-auth';
import styles from './ui/AccountControl.module.css';

export function AuthNotice({ inline = false }: { inline?: boolean }) {
  const { notice, notify } = useAuth();
  return notice ? (
    <div className={inline ? styles.inlineNotice : styles.notice} role="alert">
      <span>{notice}</span>
      <button type="button" aria-label="关闭登录提示" onClick={() => notify(null)}>
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  ) : null;
}
