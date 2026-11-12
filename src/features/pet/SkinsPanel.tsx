import { useCallback, useState } from 'react';
import type { PetPort } from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { usePetOperation, usePetResource } from './resource';
import { ResourceView, OperationNotice } from './Feedback';
import { ConfirmAction } from './ConfirmAction';
import { PetSprite } from './PetSprite';
import styles from './Panels.module.css';

export function SkinsPanel({
  service,
  currentUrl,
  onChange,
}: {
  service: PetPort;
  currentUrl: string;
  onChange: () => void;
}) {
  const [current, setCurrent] = useState(1);
  const load = useCallback(
    (signal: AbortSignal) => service.skins(current, signal),
    [service, current],
  );
  const resource = usePetResource(load);
  const operation = usePetOperation();
  function refresh() {
    resource.reload();
    onChange();
  }
  return (
    <>
      <OperationNotice notice={operation.notice} />
      <ResourceView state={resource.state} reload={resource.reload}>
        {(data) => (
          <>
            {!data.records.length && (
              <div className={styles.feedback}>暂无可用外观，稍后再来看看。</div>
            )}
            <div className={styles.grid}>
              {data.records.map((skin) => (
                <article className={styles.card} key={skin.id}>
                  <div className={styles.skinPreview}>
                    <PetSprite url={skin.url} name={skin.name} size={90} />
                  </div>
                  <strong>{skin.name}</strong>
                  <p>{skin.description || '伙伴的新模样'}</p>
                  <div className={styles.actions}>
                    {skin.owned ? (
                      <Button
                        disabled={operation.pending || skin.url === currentUrl}
                        onClick={() =>
                          void operation.run(
                            (s) => service.skinAction('set', skin.id, s),
                            '伙伴外观已更换',
                            refresh,
                          )
                        }
                      >
                        {skin.url === currentUrl ? '正在使用' : '使用外观'}
                      </Button>
                    ) : (
                      <ConfirmAction
                        label={`兑换 · ${skin.points} 积分`}
                        description={`消耗 ${skin.points} 积分兑换「${skin.name}」，是否继续？`}
                        action={(s) => service.skinAction('exchange', skin.id, s)}
                        onSuccess={refresh}
                      />
                    )}
                  </div>
                </article>
              ))}
            </div>
            <div className={styles.pagination}>
              <Button
                variant="secondary"
                disabled={current === 1}
                onClick={() => setCurrent(current - 1)}
              >
                上一页
              </Button>
              <span>
                第 {current} 页 · 共 {data.total} 款
              </span>
              <Button
                variant="secondary"
                disabled={current * 12 >= data.total}
                onClick={() => setCurrent(current + 1)}
              >
                下一页
              </Button>
            </div>
          </>
        )}
      </ResourceView>
    </>
  );
}
