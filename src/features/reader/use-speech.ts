import { useEffect, useRef, useState } from 'react';
import type { ReaderSettings } from '@/domain/reader';

export function useSpeech(
  paragraphs: string[],
  settings: ReaderSettings,
  enabled: boolean,
  onError: (message: string) => void,
) {
  const [state, setState] = useState<'stopped' | 'speaking' | 'paused'>('stopped');
  const [highlight, setHighlight] = useState(-1);
  const session = useRef(0);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const stop = () => {
    ++session.current;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setState('stopped');
    setHighlight(-1);
  };
  useEffect(() => {
    const currentSession = session;
    return () => {
      ++currentSession.current;
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setState('stopped');
      setHighlight(-1);
    };
  }, [paragraphs, enabled, settings.ttsEnabled]);
  const start = (index: number) => {
    if (!settings.ttsEnabled || !enabled) return;
    if (!('speechSynthesis' in window)) {
      onError('当前浏览器不支持朗读');
      return;
    }
    stop();
    const id = session.current;
    const speak = (position: number) => {
      if (id !== session.current) return;
      if (position >= paragraphs.length) {
        setState('stopped');
        setHighlight(-1);
        return;
      }
      const current = new SpeechSynthesisUtterance(paragraphs[position]);
      utterance.current = current;
      current.lang = 'zh-CN';
      current.rate = settings.speechRate;
      current.pitch = settings.speechPitch;
      current.volume = settings.speechVolume;
      const voice = window.speechSynthesis
        .getVoices()
        .find((voice) =>
          settings.voice === 'auto'
            ? voice.lang.startsWith('zh')
            : voice.voiceURI === settings.voice,
        );
      if (voice) current.voice = voice;
      current.onstart = () => {
        if (id === session.current) {
          setState('speaking');
          setHighlight(position);
        }
      };
      current.onend = () => speak(position + 1);
      current.onerror = (event) => {
        if (id === session.current && !['canceled', 'interrupted'].includes(event.error)) {
          stop();
          onError('朗读失败，请检查系统声音后重试');
        }
      };
      window.speechSynthesis.speak(current);
    };
    speak(index);
  };
  return {
    state,
    highlight,
    stop,
    start,
    toggle() {
      if (state === 'speaking') {
        window.speechSynthesis.pause();
        setState('paused');
      } else if (state === 'paused') {
        window.speechSynthesis.resume();
        setState('speaking');
      } else start(0);
    },
  };
}
