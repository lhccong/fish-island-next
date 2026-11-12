import { useEffect, useState } from 'react';
import type { ReaderSettings } from '@/domain/reader';
import { Select } from '@/shared/ui/Select';
import { Slider } from '@/shared/ui/Slider';
import { Switch } from '@/shared/ui/Switch';
import styles from './ReaderSettings.module.css';

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
    <div className={styles.speech}>
      <div className={styles.switchRow}>
        <span>启用朗读功能</span>
        <Switch
          label="启用朗读功能"
          checked={settings.ttsEnabled}
          disabled={!supported}
          onCheckedChange={(ttsEnabled) => onChange({ ttsEnabled })}
        />
      </div>
      <p className={styles.help}>
        {supported
          ? '开启后，使用阅读器的朗读按钮开始播放。朗读时可点击段落，从该段继续。'
          : '当前浏览器不支持语音合成，请在支持的浏览器中使用。'}
      </p>
      <div className={styles.field}>
        <span className={styles.caption}>选择声音</span>
        <Select
          label="声音"
          disabled={!supported || !settings.ttsEnabled}
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
      </div>
      <div className={styles.sliders}>
        {(
          [
            ['speechRate', '语速', 0.5, 3],
            ['speechPitch', '音调', 0, 2],
            ['speechVolume', '音量', 0, 1],
          ] as const
        ).map(([key, label, min, max]) => (
          <Slider
            key={key}
            label={label}
            min={min}
            max={max}
            step={0.1}
            disabled={!supported || !settings.ttsEnabled}
            value={settings[key]}
            valueText={
              key === 'speechVolume' ? `${Math.round(settings[key] * 100)}%` : String(settings[key])
            }
            onValueChange={(value) => onChange({ [key]: value })}
          />
        ))}
      </div>
      <p className={styles.hint}>可用声音由设备提供。关闭、切章或隐藏阅读器时会停止朗读。</p>
    </div>
  );
}
