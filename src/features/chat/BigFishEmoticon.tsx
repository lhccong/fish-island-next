import { useEffect, useState } from 'react';
import type { BigFishEmoticonKeyword } from '@/domain/chat';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { CompactMessageImage } from './CompactMessageImage';
import { MessageImage } from './MessageImage';
import { useChatRealtime } from './realtime-context';

export function BigFishEmoticon({
  id,
  url,
  keyword,
  compact,
}: {
  id: string;
  url: string | undefined;
  keyword: BigFishEmoticonKeyword | undefined;
  compact: boolean;
}) {
  const Image = compact ? CompactMessageImage : MessageImage;
  if (url) return <Image url={url} />;
  if (!keyword) return null;
  return <SearchedEmoticon key={`${id}:${keyword}`} id={id} keyword={keyword} Image={Image} />;
}

function SearchedEmoticon({
  id,
  keyword,
  Image,
}: {
  id: string;
  keyword: BigFishEmoticonKeyword;
  Image: typeof MessageImage;
}) {
  const { emoticons } = useChatRealtime();
  const [url, setUrl] = useState<string | null>();

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      const results = await emoticons.searchForBigFish(keyword);
      if (!active) return;
      let hash = 2166136261;
      for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
      setUrl(results[(hash >>> 0) % results.length] ?? null);
    });
    return () => {
      active = false;
    };
  }, [id, keyword, emoticons]);

  if (url === undefined) return <LoadingIndicator compact>查找表情包…</LoadingIndicator>;
  return url ? <Image url={url} /> : null;
}
