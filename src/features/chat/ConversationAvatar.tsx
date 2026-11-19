import type { ChatListEntry } from './camouflage-conversations';
import { CoverAvatar } from './CoverAvatar';
import { MemberAvatar } from './MemberAvatar';

export function ConversationAvatar({ entry }: { entry: ChatListEntry }) {
  return entry.kind === 'member' ? (
    <MemberAvatar key={entry.member.avatar} member={entry.member} size="list" showFrame={false} />
  ) : (
    <CoverAvatar conversation={entry} />
  );
}
