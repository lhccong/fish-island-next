import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, LoaderCircle } from 'lucide-react';
import styles from './Toast.module.css';
export function Toast({ message, pending = false }: { message: string; pending?: boolean }) {
  return <ToastMessage key={`${pending}:${message}`} message={message} pending={pending} />;
}
function ToastMessage({ message, pending }: { message: string; pending: boolean }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (pending) return;
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [pending]);
  if (!visible) return null;
  return createPortal(
    <div className={styles.position}>
      <div className={styles.toast} role="status" aria-live="polite" aria-atomic="true">
        {pending ? (
          <LoaderCircle size={18} className={styles.spinner} aria-hidden="true" />
        ) : (
          <Info size={18} aria-hidden="true" />
        )}
        <span>{message}</span>
      </div>
    </div>,
    document.body,
  );
}
