import { createStore } from 'zustand/vanilla';
import { songKey, type MusicPort, type MusicSource, type Song } from './domain';
import { createMusicRecommendations } from './recommendation-controller';

export function createMusicPlayer(port: MusicPort, audio: HTMLAudioElement) {
  const store = createStore(() => ({
    current: null as Song | null,
    queue: [] as Song[],
    status: 'idle' as 'idle' | 'loading' | 'playing' | 'paused' | 'error',
    error: '',
    notice: '',
    volume: 0.7,
    recommendationSource: null as MusicSource | null,
    recommendationStatus: 'idle' as 'idle' | 'loading' | 'error',
    recommendationError: '',
  }));
  const progress = createStore(() => ({ position: 0, duration: 0 }));
  let request: AbortController | undefined;
  let disposed = false;
  let generation = 0;
  let recommendationGeneration = 0;
  const recommendations = createMusicRecommendations(port);
  let recommendationPool: Song[] = [];
  function cancelRecommendations() {
    recommendationGeneration++;
    recommendations.cancel();
    store.setState({ recommendationStatus: 'idle', recommendationError: '' });
  }
  audio.preload = 'none';
  audio.volume = 0.7;
  const update = () =>
    progress.setState({
      position: audio.currentTime || 0,
      duration: Number.isFinite(audio.duration) ? audio.duration : 0,
    });
  const pause = () => {
    if (store.getState().current && store.getState().status !== 'error')
      store.setState({ status: 'paused' });
  };
  const playing = () => store.setState({ status: 'playing', error: '' });
  const waiting = () => {
    if (!audio.paused) store.setState({ status: 'loading' });
  };
  const failed = () => {
    if (store.getState().current)
      store.setState({ status: 'error', error: '歌曲加载失败，可重试播放或切换下一首' });
  };
  async function resume() {
    const version = generation;
    try {
      await audio.play();
    } catch {
      if (!disposed && version === generation)
        store.setState({ status: 'paused', error: '播放未能开始，请点击播放重试' });
    }
  }
  async function play(song: Song) {
    cancelRecommendations();
    recommendationPool = recommendationPool.filter(
      (candidate) => songKey(candidate) !== songKey(song),
    );
    request?.abort();
    const current = new AbortController();
    request = current;
    generation++;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    progress.setState({ position: 0, duration: 0 });
    store.setState({ current: song, status: 'loading', error: '', notice: '' });
    try {
      const url = await port.resolve(song, current.signal);
      if (disposed || current.signal.aborted) return;
      audio.src = url;
      await resume();
    } catch (error) {
      if (!disposed && !current.signal.aborted)
        store.setState({
          status: 'error',
          error: error instanceof Error ? error.message : '获取播放地址失败，请重试',
        });
    } finally {
      if (request === current) request = undefined;
    }
  }
  function next() {
    const state = store.getState();
    if (!state.queue.length && state.recommendationStatus === 'loading') return;
    const [song, ...queue] = store.getState().queue;
    store.setState({ queue });
    if (song) void play(song);
    else if (state.recommendationSource) {
      const candidate = recommendationPool.shift();
      if (candidate) void play(candidate);
      else void loadRecommendations(state.recommendationSource);
    } else {
      request?.abort();
      request = undefined;
      generation++;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      store.setState({ status: 'idle', current: null, error: '' });
      progress.setState({ position: 0, duration: 0 });
    }
  }
  async function loadRecommendations(source: MusicSource) {
    const version = ++recommendationGeneration;
    store.setState({ recommendationStatus: 'loading', recommendationError: '' });
    try {
      const batch = await recommendations.load(source, store.getState().current);
      if (!batch || disposed || version !== recommendationGeneration) return;
      recommendationPool = batch;
      const song = recommendationPool.shift()!;
      void play(song);
    } catch (error) {
      if (!disposed && version === recommendationGeneration)
        store.setState({
          recommendationStatus: 'error',
          recommendationError: error instanceof Error ? error.message : '推荐歌曲获取失败，请重试',
        });
    }
  }
  const listeners = {
    timeupdate: update,
    durationchange: update,
    pause,
    playing,
    waiting,
    error: failed,
    ended: () => {
      store.setState({ status: 'paused' });
      next();
    },
  };
  Object.entries(listeners).forEach(([event, listener]) => audio.addEventListener(event, listener));
  return {
    store,
    progress,
    add(song: Song) {
      const state = store.getState();
      if (
        (state.current && songKey(state.current) === songKey(song)) ||
        state.queue.some((item) => songKey(item) === songKey(song))
      ) {
        store.setState({ notice: '这首歌已在播放或待播队列中' });
        return;
      }
      if (!state.current) {
        void play(song);
        return;
      }
      if (state.queue.length >= 50) {
        store.setState({ notice: '待播队列已满，请先移除歌曲' });
        return;
      }
      store.setState({ queue: [...state.queue, song], notice: `已点播：${song.name}` });
    },
    remove(key: string) {
      store.setState({ queue: store.getState().queue.filter((song) => songKey(song) !== key) });
    },
    next,
    toggleRecommendations(source: MusicSource) {
      if (store.getState().recommendationSource) {
        cancelRecommendations();
        recommendationPool = [];
        store.setState({ recommendationSource: null });
        return;
      }
      store.setState({ recommendationSource: source });
      if (!store.getState().current) next();
    },
    retryRecommendations() {
      const { recommendationSource, recommendationStatus } = store.getState();
      if (recommendationSource && recommendationStatus === 'error')
        void loadRecommendations(recommendationSource);
    },
    changeRecommendationSource(source: MusicSource) {
      if (!store.getState().recommendationSource) return;
      cancelRecommendations();
      recommendationPool = [];
      store.setState({ recommendationSource: source });
      if (!store.getState().current) next();
    },
    playNow(song: Song) {
      const state = store.getState();
      if (state.current && songKey(state.current) === songKey(song)) {
        if (state.status === 'paused') void resume();
        else if (state.status === 'error') void play(song);
        return;
      }
      store.setState({ queue: state.queue.filter((item) => songKey(item) !== songKey(song)) });
      void play(song);
    },
    stop() {
      cancelRecommendations();
      recommendationPool = [];
      store.setState({ queue: [], recommendationSource: null });
      next();
    },
    toggle() {
      const { status, current } = store.getState();
      if (!current) return;
      if (status === 'error') void play(current);
      else if (status === 'playing' || status === 'loading') audio.pause();
      else void resume();
    },
    seek(position: number) {
      if (Number.isFinite(audio.duration)) {
        audio.currentTime = Math.max(0, Math.min(position, audio.duration));
        update();
      }
    },
    volume(value: number) {
      audio.volume = Math.max(0, Math.min(1, value));
      store.setState({ volume: audio.volume });
    },
    dispose() {
      disposed = true;
      recommendations.cancel();
      generation++;
      request?.abort();
      Object.entries(listeners).forEach(([event, listener]) =>
        audio.removeEventListener(event, listener),
      );
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    },
  };
}
export type MusicPlayer = ReturnType<typeof createMusicPlayer>;
