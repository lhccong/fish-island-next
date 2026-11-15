import type { AdminPort } from '@/domain/admin';
import { ReportActions } from './ReportActions';
import { reportStatuses, labelOf } from './options';
import styles from './Admin.module.css';
import { AdminList } from './AdminList';
export function ReportList({ port }: { port: AdminPort }) {
  return (
    <AdminList
      port={port}
      section="report"
      columns={[
        { key: 'id', label: 'ID', render: (v) => v.id, width: 80 },
        { key: 'type', label: '举报类型', render: (v) => v.typeText || String(v.type), width: 110 },
        { key: 'reason', label: '举报原因', render: (v) => v.reason, primary: true, width: 140 },
        {
          key: 'reporter',
          label: '举报人',
          render: (v) => v.reporterName || v.reporterId,
          width: 160,
        },
        {
          key: 'targetUser',
          label: '被举报用户',
          render: (v) => v.targetUserName || v.targetUserId,
          width: 160,
        },
        { key: 'targetId', label: '被举报对象ID', render: (v) => v.targetId, width: 140 },
        { key: 'description', label: '补充说明', render: (v) => v.description, width: 160 },
        {
          key: 'content',
          label: '聊天内容',
          render: (v) => (v.type === 1 ? v.content : '—'),
          width: 180,
        },
        {
          key: 'status',
          label: '处理状态',
          render: (v) => (
            <span className={styles.tag} data-status={v.status}>
              {labelOf(reportStatuses, v.status)}
            </span>
          ),
          width: 100,
        },
        {
          key: 'createdAt',
          label: '创建时间',
          render: (v) => v.createdAt,
          sortField: 'createTime',
          width: 170,
        },
        { key: 'handledAt', label: '处理时间', render: (v) => v.handledAt, width: 170 },
        { key: 'remark', label: '处理备注', render: (v) => v.remark, width: 140 },
      ]}
      extra={(v, onSaved) => (
        <ReportActions key={`${v.id}:${v.status}`} port={port} report={v} onSaved={onSaved} />
      )}
    />
  );
}
