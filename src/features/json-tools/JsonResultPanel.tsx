import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Select } from '@/shared/ui/Select';
import type { JsonMode } from '@/domain/json-tools';
import type { JsonOutput } from './model/use-json-editor';
import { JsonTree } from './ui/JsonTree';
import styles from './JsonEditor.module.css';

const modes = [
  { value: 'tree', label: '树视图' },
  { value: 'formatted', label: '格式化 JSON' },
  { value: 'compressed', label: '压缩 JSON' },
  { value: 'yaml', label: 'YAML' },
] as const;

const depths = [
  { value: '1', label: '展开 1 层' },
  { value: '2', label: '展开 2 层' },
  { value: '3', label: '展开 3 层' },
  { value: 'Infinity', label: '全部展开' },
  { value: '0', label: '全部折叠' },
];

export function JsonResultPanel({
  output,
  mode,
  onModeChange,
  onUseOutput,
}: {
  output: JsonOutput;
  mode: JsonMode;
  onModeChange: (mode: JsonMode) => void;
  onUseOutput: (text: string) => void;
}) {
  const [depth, setDepth] = useState('1');
  const [feedback, setFeedback] = useState<{
    output: JsonOutput;
    message: string;
    error: boolean;
  }>();
  const result = output.kind === 'ready' ? output : null;

  function report(message: string, error = false) {
    setFeedback({ output, message, error });
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.text);
      report('已复制结果');
    } catch {
      report(
        mode === 'tree'
          ? '复制失败，可切换到格式化 JSON 后手动复制。'
          : '复制失败，请手动选中结果复制。',
        true,
      );
    }
  }

  function download() {
    if (!result) return;
    try {
      const yaml = mode === 'yaml';
      const link = document.createElement('a');
      const url = URL.createObjectURL(
        new Blob([result.text], { type: yaml ? 'application/yaml' : 'application/json' }),
      );
      try {
        link.href = url;
        link.download = yaml ? 'formatted.yaml' : 'formatted.json';
        document.body.append(link);
        link.click();
        report('已开始下载');
      } finally {
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch {
      report('下载失败，请重试。', true);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="json-result-heading">
      <div className={styles.panelHeader}>
        <h2 id="json-result-heading">处理结果</h2>
        <div className={styles.controls}>
          <Select
            label="输出格式"
            value={mode}
            options={modes}
            onValueChange={(value) => {
              const next = modes.find((option) => option.value === value);
              if (next) onModeChange(next.value);
            }}
          />
          <Button variant="secondary" disabled={!result} onClick={() => void copy()}>
            复制
          </Button>
          <Button variant="secondary" disabled={!result} onClick={download}>
            下载
          </Button>
        </div>
      </div>
      <div className={styles.output}>
        <ScrollArea
          label="结果滚动区"
          gutter="reserved"
          fillContent
          className={styles.outputScroll ?? ''}
        >
          {output.kind === 'processing' && <LoadingIndicator>正在处理 JSON…</LoadingIndicator>}
          {output.kind === 'empty' && (
            <div className={styles.placeholder}>处理结果将显示在这里</div>
          )}
          {output.kind === 'error' && <div className={styles.placeholder}>暂时无法生成结果</div>}
          {result?.tree && <JsonTree key={depth} value={result.tree.value} expandDepth={depth} />}
          {result && !result.tree && <pre className={styles.code}>{result.text}</pre>}
        </ScrollArea>
      </div>
      <div className={styles.panelFooter}>
        {mode === 'tree' && result?.tree && (
          <Select label="树视图展开层级" value={depth} options={depths} onValueChange={setDepth} />
        )}
        {mode === 'tree' && result && !result.tree && (
          <span className={styles.status}>节点较多或嵌套较深，已显示完整文本。</span>
        )}
        {mode !== 'yaml' && (
          <Button
            variant="secondary"
            disabled={!result}
            onClick={() => result && onUseOutput(result.text)}
          >
            用作输入
          </Button>
        )}
        {feedback?.output === output && (
          <span
            className={feedback.error ? styles.error : styles.status}
            role={feedback.error ? 'alert' : 'status'}
          >
            {feedback.message}
          </span>
        )}
      </div>
    </section>
  );
}
