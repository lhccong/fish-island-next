import { useDeferredValue, useMemo, useState } from 'react';
import {
  parseJson,
  renderJson,
  supportsJsonTree,
  type JsonMode,
  type JsonValue,
} from '@/domain/json-tools';

export type JsonOutput =
  | { kind: 'empty' }
  | { kind: 'processing' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; text: string; tree: { value: JsonValue } | null };

export function useJsonEditor() {
  const [input, setInput] = useState('');
  const [automatic, setAutomatic] = useState(true);
  const [processedInput, setProcessedInput] = useState<string | null>(null);
  const [validationInput, setValidationInput] = useState<string | null>(null);
  const [indent, setIndent] = useState('2');
  const [mode, setMode] = useState<JsonMode>('tree');
  const deferredInput = useDeferredValue(input);
  const current = processedInput === input;
  const updating = automatic && !current && input !== deferredInput;
  const source = current ? input : automatic ? deferredInput : '';
  const parsed = useMemo(() => parseJson(source), [source]);
  const output = useMemo<JsonOutput>(() => {
    if (updating) return { kind: 'processing' };
    if (parsed.kind !== 'valid') return parsed;
    try {
      return {
        kind: 'ready',
        text: renderJson(parsed, mode, Number(indent)),
        tree: mode === 'tree' && supportsJsonTree(parsed.value) ? { value: parsed.value } : null,
      };
    } catch {
      return { kind: 'error', message: '结果无法生成，请减少嵌套或将 JSON 拆分后重试。' };
    }
  }, [updating, parsed, mode, indent]);

  function changeInput(value: string) {
    setInput(value);
    setProcessedInput(null);
    setValidationInput(null);
  }

  function changeAutomatic(enabled: boolean) {
    if (!enabled && !updating && parsed.kind !== 'empty') setProcessedInput(input);
    setAutomatic(enabled);
  }

  function changeMode(value: JsonMode) {
    setMode(value);
    if (!automatic) setProcessedInput(input);
  }

  function format() {
    setProcessedInput(input);
    setValidationInput(null);
    setMode('formatted');
  }

  function validate() {
    setProcessedInput(input);
    setValidationInput(input);
  }

  return {
    input,
    automatic,
    mode,
    indent,
    output,
    validation: validationInput === input ? parsed.kind : null,
    changeInput,
    changeAutomatic,
    changeMode,
    setIndent,
    format,
    validate,
  };
}
