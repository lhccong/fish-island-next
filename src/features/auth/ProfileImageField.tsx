import { useEffect, useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { useAuth } from './use-auth';
import { defaultAvatars } from './default-avatars';
import styles from './ui/Profile.module.css';

interface ProfileImageFieldProps {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onBusy: (busy: boolean) => void;
}

export function ProfileImageField({
  label,
  value,
  disabled,
  onChange,
  onBusy,
}: ProfileImageFieldProps) {
  const { uploadProfileImage } = useAuth();
  const request = useRef<AbortController | null>(null);
  const [error, setError] = useState('');
  const [failed, setFailed] = useState('');
  useEffect(() => () => request.current?.abort(), []);
  const preview = /^https?:\/\//i.test(value) && failed !== value;
  return (
    <section className={styles.imageSection} aria-label={`${label}设置`}>
      <h3>{label === '头像' ? '头像设置' : label}</h3>
      <div className={styles.imageField} data-cover={label === '朋友圈背景'}>
        <div className={styles.previewColumn}>
          <div className={styles.imagePreview} data-cover={label === '朋友圈背景'}>
            {preview ? (
              <img
                src={value}
                alt={`${label}预览`}
                referrerPolicy="no-referrer"
                onError={() => setFailed(value)}
              />
            ) : (
              <ImagePlus size={24} aria-hidden="true" />
            )}
          </div>
          {label === '头像' && <span className={styles.hint}>当前头像</span>}
        </div>
        <div className={styles.imageControls}>
          <div className={styles.uploadRow}>
            <label className={styles.upload} aria-disabled={disabled}>
              <ImagePlus size={14} aria-hidden="true" />{' '}
              {label === '头像' ? '上传图片' : '上传背景图'}
              <input
                type="file"
                aria-label={`上传${label}`}
                accept="image/png,image/jpeg,image/gif,image/webp"
                disabled={disabled}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  request.current?.abort();
                  const controller = new AbortController();
                  request.current = controller;
                  setError('');
                  onBusy(true);
                  try {
                    const url = await uploadProfileImage(file, controller.signal);
                    if (!controller.signal.aborted) onChange(url);
                  } catch (reason) {
                    if (!controller.signal.aborted)
                      setError(reason instanceof Error ? reason.message : '图片上传失败，请重试');
                  } finally {
                    if (!controller.signal.aborted) onBusy(false);
                  }
                }}
              />
            </label>
            <input
              type="url"
              aria-label={label}
              value={value}
              onChange={(event) => {
                setError('');
                onChange(event.target.value);
              }}
              placeholder="或输入在线图片地址"
              disabled={disabled}
            />
          </div>
        </div>
        {label === '头像' && (
          <div className={styles.presets}>
            <span className={styles.hint}>默认：</span>
            {defaultAvatars.map((url, index) => (
              <button
                type="button"
                key={url}
                aria-label={`默认头像 ${index + 1}`}
                aria-pressed={value === url}
                disabled={disabled}
                onClick={() => {
                  setError('');
                  onChange(url);
                }}
              >
                <img
                  src={url}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={(event) => {
                    event.currentTarget.style.visibility = 'hidden';
                  }}
                />
                <span aria-hidden="true">{index + 1}</span>
              </button>
            ))}
          </div>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {value && !preview && (
          <p className={styles.hint}>图片暂时无法预览，请检查地址或重新上传。</p>
        )}
      </div>
    </section>
  );
}
