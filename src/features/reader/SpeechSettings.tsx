import { useEffect, useState } from 'react';
import type { ReaderSettings } from '@/domain/reader';
import { Select } from '@/shared/ui/Select';
import styles from './Reader.module.css';
export function SpeechSettings({
  settings,
  onChange,
}: {
  settings: ReaderSettings;
  onChange: (patch: Partial<ReaderSettings>) => void;
}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const supported = 'speechSynthesis' in window;
  useEffect(() => {
    if (!supported) return;
    const update = () => setVoices(window.speechSynthesis.getVoices());
    update();
    window.speechSynthesis.addEventListener('voiceschanged', update);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update);
  }, [supported]);
  return (
    <fieldset>
      <legend>朗读</legend>
      {!supported ? (
        <p>当前浏览器不支持语音合成</p>
      ) : (
        <>
          <Select
            label="朗读功能"
            value={String(settings.ttsEnabled)}
            options={[
              { value: 'false', label: '关闭朗读功能' },
              { value: 'true', label: '启用朗读功能' },
            ]}
            onValueChange={(value) => onChange({ ttsEnabled: value === 'true' })}
          />
          <Select
            label="声音"
            value={settings.voice}
            options={[
              { value: 'auto', label: '系统默认中文声音' },
              ...voices.map((voice) => ({
                value: voice.voiceURI,
                label: `${voice.name} (${voice.lang})`,
              })),
            ]}
            onValueChange={(voice) => onChange({ voice })}
          />
          <div className={styles.formGrid}>
            {(
              [
                ['speechRate', '语速', 0.5, 3],
                ['speechPitch', '音调', 0, 2],
                ['speechVolume', '音量', 0, 1],
              ] as const
            ).map(([key, label, min, max]) => (
              <label key={key}>
                {label}
                <input
                  type="number"
                  min={min}
                  max={max}
                  step="0.1"
                  value={settings[key]}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (value >= min && value <= max) onChange({ [key]: value });
                  }}
                />
              </label>
            ))}
          </div>
          <p className={styles.hint}>声音由设备提供；朗读时可点击正文段落从该处开始。</p>
        </>
      )}
    </fieldset>
  );
}
