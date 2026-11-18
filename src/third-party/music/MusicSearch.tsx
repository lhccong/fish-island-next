import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { ListMusic, Search, Sparkles, X } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { InfiniteScroll } from '@/shared/ui/InfiniteScroll';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { songKey, type MusicPort, type MusicSource, type Song } from './domain';
import { createMusicSearch } from './search-controller';
import type { MusicPlayer } from './player-controller';
import { MusicShareButton } from './MusicShareButton';
import styles from './Music.module.css';

export function MusicSearch({
  port,
  player,
  open,
  onShare,
}: {
  port: MusicPort;
  player: MusicPlayer;
  open: boolean;
  onShare: (song: Song) => void;
}) {
  const [controller] = useState(() => createMusicSearch(port));
  const state = useStore(controller.store);
  const [keyword, setKeyword] = useState('');
  const [source, setSource] = useState<MusicSource>('netease');
  const [tab, setTab] = useState<'search' | 'queue'>('search');
  const queue = useStore(player.store, (state) => state.queue);
  const recommendationSource = useStore(player.store, (state) => state.recommendationSource);
  useEffect(() => {
    controller.activate();
    return () => controller.dispose();
  }, [controller]);
  useEffect(() => {
    if (!open) controller.cancel();
  }, [open, controller]);
  return (
    <>
      <form
        className={styles.search}
        onSubmit={(event) => {
          event.preventDefault();
          setTab('search');
          controller.search(source, keyword);
        }}
      >
        <Select
          label="音乐来源"
          value={source}
          onValueChange={(value) => {
            setSource(value as MusicSource);
            player.changeRecommendationSource(value as MusicSource);
            controller.search(value as MusicSource, keyword);
          }}
          options={[
            { value: 'netease', label: '网易云' },
            { value: 'tencent', label: 'QQ 音乐' },
          ]}
        />
        <input
          aria-label="搜索歌曲或歌手"
          placeholder="歌曲或歌手"
          maxLength={80}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <Button type="submit" disabled={!keyword.trim()}>
          <Search size={16} aria-hidden="true" />
          搜索
        </Button>
      </form>
      <div className={styles.tabs} aria-label="音乐列表切换">
        <Button
          variant="secondary"
          aria-pressed={tab === 'search'}
          onClick={() => setTab('search')}
        >
          搜索结果
        </Button>
        <Button variant="secondary" aria-pressed={tab === 'queue'} onClick={() => setTab('queue')}>
          <ListMusic size={16} aria-hidden="true" />
          待播 {queue.length}
        </Button>
        <Button
          variant="secondary"
          className={styles.recommendations ?? ''}
          aria-pressed={!!recommendationSource}
          onClick={() => player.toggleRecommendations(source)}
        >
          <Sparkles size={16} aria-hidden="true" />
          今日推荐
        </Button>
      </div>
      <ScrollArea
        gutter="reserved"
        fillContent
        label={tab === 'search' ? '音乐搜索结果' : '待播队列'}
        className={styles.scroll ?? ''}
      >
        {tab === 'queue' ? (
          <div className={styles.list}>
            {!queue.length && <p className={styles.empty}>暂无待播歌曲，搜索后点歌加入</p>}
            {queue.map((song) => (
              <div className={styles.song} key={songKey(song)}>
                <div className={styles.songInfo}>
                  <strong>{song.name}</strong>
                  <span>{song.artist}</span>
                </div>
                <div className={styles.songActions}>
                  <MusicShareButton song={song} onShare={onShare} />
                  <Button
                    variant="secondary"
                    className={styles.remove ?? ''}
                    aria-label={`移除 ${song.name}`}
                    onClick={() => player.remove(songKey(song))}
                  >
                    <X size={16} aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : state.status === 'loading' && !state.items.length ? (
          <LoadingIndicator>正在搜索歌曲…</LoadingIndicator>
        ) : (
          <div className={styles.list}>
            {state.status === 'idle' && (
              <p className={styles.empty}>搜索喜欢的歌曲，或直接听今日推荐</p>
            )}
            {state.status === 'ready' && !state.items.length && (
              <p className={styles.empty}>没有找到歌曲，试试其他关键词或来源</p>
            )}
            {state.items.map((song) => (
              <div className={styles.song} key={songKey(song)}>
                <div className={styles.songInfo}>
                  <strong>{song.name}</strong>
                  <span>{song.artist}</span>
                </div>
                <div className={styles.songActions}>
                  <MusicShareButton song={song} onShare={onShare} />
                  <Button
                    variant="secondary"
                    aria-label={`点歌 ${song.name}`}
                    onClick={() => player.add(song)}
                  >
                    点歌
                  </Button>
                </div>
              </div>
            ))}
            {state.status !== 'idle' && (state.items.length > 0 || state.error) && (
              <InfiniteScroll
                enabled={open && tab === 'search'}
                label="歌曲"
                hasMore={state.hasMore}
                loading={state.status === 'loading'}
                error={state.error}
                onLoadMore={() => void controller.load()}
                {...(state.items.length >= 100
                  ? { summary: '已显示 100 首，请细化关键词查找' }
                  : {})}
              />
            )}
          </div>
        )}
      </ScrollArea>
    </>
  );
}
