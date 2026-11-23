import { useRef } from 'react';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { Select } from '@/shared/ui/Select';
import { Switch } from '@/shared/ui/Switch';
import { useJsonEditor } from './model/use-json-editor';
import { useJsonFile } from './model/use-json-file';
import { JsonResultPanel } from './JsonResultPanel';
import styles from './JsonEditor.module.css';

const example = '{"名称":"摸鱼岛","工具":[{"名称":"JSON 格式化","可用":true}],"备注":null}';
const indents = [2, 4, 8].map((size) => ({ value: String(size), label: `${size} 空格` }));

export function JsonEditor() {
  const editor = useJsonEditor();
  const inputFile = useRef<HTMLInputElement>(null);
  const file = useJsonFile(editor.changeInput);
  const error =
    file.state.kind === 'error'
      ? file.state.message
      : editor.output.kind === 'error'
        ? editor.output.message
        : null;

  function changeInput(input: string) {
    file.reset();
    editor.changeInput(input);
  }

  return (
    <div className={styles.editor}>
      <section className={styles.panel} aria-labelledby="json-input-label">
        <div className={styles.panelHeader}>
          <h2>
            <label id="json-input-label" htmlFor="json-input">
              输入 JSON
            </label>
          </h2>
          <div className={styles.controls}>
            <Button variant="secondary" onClick={() => changeInput(example)}>
              示例
            </Button>
            <Button variant="secondary" onClick={() => inputFile.current?.click()}>
              打开文件
            </Button>
            <Button
              variant="secondary"
              disabled={!editor.input && file.state.kind === 'idle'}
              onClick={() => changeInput('')}
            >
              清空
            </Button>
            <input
              ref={inputFile}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(event) => {
                const selected = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                if (selected) file.importFile(selected);
              }}
            />
          </div>
        </div>
        <textarea
          id="json-input"
          className={styles.input}
          placeholder="在此输入或粘贴 JSON"
          value={editor.input}
          onChange={(event) => changeInput(event.currentTarget.value)}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          aria-invalid={editor.output.kind === 'error' || undefined}
          aria-describedby={error ? 'json-input-error' : undefined}
        />
        <div className={styles.panelFooter}>
          <Button disabled={!editor.input} onClick={editor.format}>
            格式化
          </Button>
          <Button variant="secondary" disabled={!editor.input} onClick={editor.validate}>
            校验
          </Button>
          <Select
            label="缩进"
            options={indents}
            value={editor.indent}
            onValueChange={editor.setIndent}
          />
          <div className={styles.automatic}>
            <span aria-hidden="true">自动处理</span>
            <Switch
              label="自动处理"
              checked={editor.automatic}
              onCheckedChange={editor.changeAutomatic}
            />
          </div>
        </div>
        {file.state.kind === 'loading' && (
          <LoadingIndicator compact>正在读取文件…</LoadingIndicator>
        )}
        {error && (
          <p id="json-input-error" className={styles.error} role="alert">
            {error}
          </p>
        )}
        {!error && editor.validation && (
          <p className={styles.status} role="status">
            {editor.validation === 'valid' ? 'JSON 格式有效' : '请输入 JSON'}
          </p>
        )}
      </section>
      <JsonResultPanel
        output={editor.output}
        mode={editor.mode}
        onModeChange={editor.changeMode}
        onUseOutput={changeInput}
      />
    </div>
  );
}
