import { useRef, useState } from 'react';
import type { AdminPort, AdminReport } from '@/domain/admin';
import { Button } from '@/shared/ui/Button';
import { EditorFrame } from './EditorFrame';
import { Field, TextField, Choice } from './fields';
import { reportStatuses, labelOf } from './options';
import styles from './Admin.module.css';
export function ReportActions({
  port,
  report,
  onSaved,
}: {
  port: AdminPort;
  report: AdminReport;
  onSaved: () => void;
}) {
  const [action, setAction] = useState<'handle' | 'mute' | null>(null);
  const origin = useRef<HTMLElement | null>(null);
  const [status, setStatus] = useState('1');
  const [remark, setRemark] = useState(report.remark);
  const [duration, setDuration] = useState(3600);
  const [notice, setNotice] = useState('');
  const close = () => setAction(null);
  return (
    <>
      <Button
        variant="secondary"
        onClick={(e) => {
          origin.current = e.currentTarget;
          setAction('handle');
        }}
      >
        {report.status === 0 ? '处理' : '详情'}
      </Button>
      {report.targetUserId && (
        <Button
          variant="secondary"
          onClick={(e) => {
            origin.current = e.currentTarget;
            setAction('mute');
          }}
        >
          禁言
        </Button>
      )}
      {notice && <span role="status">{notice}</span>}
      {action === 'handle' && (
        <EditorFrame
          size="report"
          title={report.status === 0 ? '处理举报' : '举报详情'}
          submitLabel={report.status === 0 ? '提交处理' : '关闭'}
          returnFocusRef={origin}
          onClose={close}
          onSaved={() => {
            close();
            if (report.status === 0) onSaved();
          }}
          onSubmit={(s) =>
            report.status === 0
              ? port.handleReport(report.id, Number(status), remark, s)
              : Promise.resolve()
          }
        >
          <dl className={styles.details}>
            <div>
              <dt>举报ID</dt>
              <dd>{report.id}</dd>
            </div>
            <div>
              <dt>举报类型</dt>
              <dd>{report.typeText || report.type}</dd>
            </div>
            <div>
              <dt>举报原因</dt>
              <dd>{report.reason}</dd>
            </div>
            <div>
              <dt>处理状态</dt>
              <dd>{labelOf(reportStatuses, report.status)}</dd>
            </div>
            <div>
              <dt>举报人</dt>
              <dd>{report.reporterName || report.reporterId}</dd>
            </div>
            <div>
              <dt>被举报用户</dt>
              <dd>{report.targetUserName || report.targetUserId || '—'}</dd>
            </div>
            <div>
              <dt>被举报对象ID</dt>
              <dd>{report.targetId}</dd>
            </div>
            <div>
              <dt>创建时间</dt>
              <dd>{report.createdAt || '—'}</dd>
            </div>
            <div className={styles.wide}>
              <dt>补充说明</dt>
              <dd>{report.description || '—'}</dd>
            </div>
            <div className={styles.wide}>
              <dt>聊天内容</dt>
              <dd>{report.content || '—'}</dd>
            </div>
            {report.status !== 0 && (
              <div className={styles.wide}>
                <dt>处理时间</dt>
                <dd>{report.handledAt || '—'}</dd>
              </div>
            )}
          </dl>
          {report.status === 0 ? (
            <>
              <Choice
                label="处理结果"
                value={status}
                onChange={setStatus}
                options={reportStatuses.slice(1)}
              />
              <TextField
                label="处理备注"
                value={remark}
                maxLength={500}
                onChange={(e) => setRemark(e.target.value)}
              />
            </>
          ) : (
            <p className={styles.full}>处理备注：{report.remark || '—'}</p>
          )}
        </EditorFrame>
      )}
      {action === 'mute' && (
        <EditorFrame
          title="禁言用户"
          submitLabel="确认禁言"
          returnFocusRef={origin}
          onClose={close}
          onSaved={() => {
            close();
            setNotice('禁言成功');
          }}
          onSubmit={(s) => port.muteUser(report.targetUserId, duration, s)}
        >
          <p className={styles.full}>禁言「{report.targetUserName || report.targetUserId}」</p>
          <div className={styles.rowActions} role="group" aria-label="快捷禁言时长">
            {[
              [10, '10秒'],
              [60, '1分钟'],
              [300, '5分钟'],
              [3600, '1小时'],
              [86400, '1天'],
            ].map(([seconds, label]) => (
              <Button
                key={seconds}
                variant="secondary"
                aria-pressed={duration === seconds}
                onClick={() => setDuration(Number(seconds))}
              >
                {label}
              </Button>
            ))}
          </div>
          <Field
            label="禁言时间（秒）"
            type="number"
            required
            min={1}
            max={31536000}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </EditorFrame>
      )}
    </>
  );
}
