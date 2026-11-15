import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useStore } from 'zustand';
import { useChatRealtime } from './realtime-context';

export function EmoticonFeedback() {
  const { emoticons } = useChatRealtime();
  const feedback = useStore(emoticons.store, (s) => s.feedback);
  const pending = useStore(emoticons.store, (s) => s.pending);
  const error = useStore(emoticons.store, (s) => s.error);
  return feedback ? (
    <span role="status" data-tone={error ? 'error' : 'info'}>
      {pending ? <LoadingIndicator compact>{feedback}</LoadingIndicator> : feedback}
    </span>
  ) : null;
}
