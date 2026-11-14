import { hasRewardMessageContent, type ReceivedMessage } from '@/domain/chat';

const eligibility = new WeakMap<ReceivedMessage, boolean>();
function eligible(message: ReceivedMessage) {
  const cached = eligibility.get(message);
  if (cached !== undefined) return cached;
  const result =
    !message.revoked &&
    !message.quote &&
    !!message.content.trim() &&
    !['sending', 'failed'].includes(message.delivery ?? '') &&
    !hasRewardMessageContent(message.content);
  eligibility.set(message, result);
  return result;
}
export interface RepetitionView {
  visibleIds: readonly string[];
  repetitions: Readonly<Record<string, readonly string[]>>;
  viewFirstItemIndex: number;
}
export function projectRepetitions(
  ids: readonly string[],
  messages: Readonly<Record<string, ReceivedMessage>>,
  previous?: RepetitionView,
): RepetitionView {
  const visibleIds: string[] = [];
  const repetitions: Record<string, readonly string[]> = {};
  for (let start = 0; start < ids.length;) {
    const first = messages[ids[start]!]!;
    let end = start + 1;
    if (eligible(first)) {
      while (end < ids.length) {
        const next = messages[ids[end]!]!;
        if (!eligible(next) || next.content !== first.content) break;
        end++;
      }
    }
    const run = ids.slice(start, end);
    visibleIds.push(...(run.length >= 3 ? [run[0]!] : run));
    if (run.length >= 2) {
      const key = run.length >= 3 ? run[0]! : run[1]!;
      const old = previous?.repetitions[key];
      repetitions[key] =
        old?.length === run.length && old.every((id, i) => id === run[i]) ? old : run;
    }
    start = end;
  }
  const visible = new Set(visibleIds);
  const anchor = previous?.visibleIds.find((id) => visible.has(id));
  const delta = anchor ? previous!.visibleIds.indexOf(anchor) - visibleIds.indexOf(anchor) : 0;
  return {
    visibleIds:
      previous?.visibleIds.length === visibleIds.length &&
      previous.visibleIds.every((id, i) => id === visibleIds[i])
        ? previous.visibleIds
        : visibleIds,
    repetitions,
    viewFirstItemIndex: (previous?.viewFirstItemIndex ?? 1000000) + delta,
  };
}
