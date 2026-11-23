import { useEffect, useRef, useState } from 'react';
import { maxJsonLength } from '@/domain/json-tools';

type FileState = { kind: 'idle' } | { kind: 'loading' } | { kind: 'error'; message: string };

export function useJsonFile(onRead: (input: string) => void) {
  const [state, setState] = useState<FileState>({ kind: 'idle' });
  const activeReader = useRef<FileReader>(null);

  useEffect(() => () => activeReader.current?.abort(), []);

  function reset() {
    activeReader.current?.abort();
    activeReader.current = null;
    setState({ kind: 'idle' });
  }

  function importFile(file: File) {
    reset();
    if (file.size > maxJsonLength) {
      setState({ kind: 'error', message: '文件超过 2 MB，请选择较小的 JSON 文件。' });
      return;
    }
    const reader = new FileReader();
    activeReader.current = reader;
    setState({ kind: 'loading' });
    const onError = () => {
      if (activeReader.current !== reader) return;
      activeReader.current = null;
      setState({ kind: 'error', message: '文件读取失败，请重新选择文件。' });
    };
    reader.onerror = onError;
    reader.onload = () => {
      if (activeReader.current !== reader) return;
      const input = reader.result;
      if (typeof input !== 'string') {
        onError();
        return;
      }
      activeReader.current = null;
      setState({ kind: 'idle' });
      onRead(input);
    };
    try {
      reader.readAsText(file);
    } catch {
      onError();
    }
  }

  return { state, reset, importFile };
}
