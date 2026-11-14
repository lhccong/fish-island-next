import { useRef, useState } from 'react';
import { Droplets, Mail, Sprout, Users, Wheat } from 'lucide-react';
import { isMature, watering, type FarmPort, type Friend } from '@/domain/farm';
import { Button } from '@/shared/ui/Button';
import { Toast } from '@/shared/ui/Toast';
import { useFarm } from './use-farm';
import { FarmScene } from './FarmScene';
import { SeedDialog } from './SeedDialog';
import { LandDialog } from './LandDialog';
import { FarmSocial } from './FarmSocial';
import { FarmHeader } from './FarmHeader';
import styles from './Farm.module.css';
export function FarmWorkspace({ service, onPet }: { service: FarmPort; onPet: () => void }) {
  const [friend, setFriend] = useState<Friend | null>(null);
  return (
    <FarmSession
      key={friend?.id ?? 'mine'}
      service={service}
      friend={friend}
      onVisit={setFriend}
      onPet={onPet}
    />
  );
}
function FarmSession({
  service,
  friend,
  onVisit,
  onPet,
}: {
  service: FarmPort;
  friend: Friend | null;
  onVisit: (friend: Friend | null) => void;
  onPet: () => void;
}) {
  const farm = useFarm(service, friend?.id ?? null);
  const [selected, setSelected] = useState<string | null>(null);
  const [plantIds, setPlantIds] = useState<string[] | null>(null);
  const [social, setSocial] = useState<'friends' | 'visitors' | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const data = farm.data;
  const land = data?.lands.find((l) => l.id === selected);
  const empty = data?.lands.filter((l) => !l.locked && l.status === 0) ?? [];
  const mature = data?.lands.filter((l) => isMature(l, farm.now) && (!friend || l.canSteal)) ?? [];
  const waterable = data?.lands.filter((l) => watering(l, farm.now).allowed) ?? [];
  const disabled = farm.busy || farm.loading || !!farm.error;
  return (
    <div className={styles.workspace}>
      <FarmHeader
        farmer={data?.farmer}
        balance={data?.balance}
        friend={friend}
        busy={farm.busy}
        loading={farm.loading}
        onHome={() => onVisit(null)}
        onRefresh={farm.refresh}
      />
      <nav className={styles.toolbar} aria-label="农场操作">
        {!friend && (
          <>
            <Button
              variant="secondary"
              disabled={disabled || !empty.length}
              onClick={(event) => {
                returnFocus.current = event.currentTarget;
                setPlantIds(empty.map((l) => l.id));
              }}
            >
              <Sprout size={16} />
              批量播种{empty.length ? ` (${empty.length})` : ''}
            </Button>
            <Button
              variant="secondary"
              disabled={disabled || !waterable.length}
              onClick={() =>
                void farm.act(
                  'waterBatch',
                  waterable.map((l) => l.id),
                )
              }
            >
              <Droplets size={16} />
              一键浇水
            </Button>
          </>
        )}
        <Button
          disabled={disabled || !mature.length}
          onClick={() =>
            void farm.act(
              friend ? 'steal' : 'harvest',
              mature.map((l) => l.id),
            )
          }
        >
          <Wheat size={16} />
          {friend ? '一键偷菜' : '一键收获'}
          {mature.length ? ` (${mature.length})` : ''}
        </Button>
        <span className={styles.toolbarSpacer} />
        <Button variant="secondary" disabled={farm.busy} onClick={() => setSocial('friends')}>
          <Users size={16} />
          好友
        </Button>
        <Button variant="secondary" disabled={farm.busy} onClick={() => setSocial('visitors')}>
          <Mail size={16} />
          访客
        </Button>
        <Button variant="secondary" disabled={farm.busy} onClick={onPet}>
          伙伴营地
        </Button>
      </nav>
      {(farm.busy || farm.notice || (farm.loading && data)) && (
        <Toast
          message={farm.busy ? '正在处理…' : farm.loading && data ? '正在同步田地…' : farm.notice}
          pending={farm.busy || (farm.loading && !!data)}
        />
      )}
      {farm.loading && !data && (
        <p className={styles.feedback} role="status">
          正在照看田地…
        </p>
      )}
      {farm.error && (
        <div className={styles.feedback} role="alert">
          <p>{farm.error}</p>
          <Button variant="secondary" disabled={farm.busy} onClick={farm.refresh}>
            重新加载
          </Button>
        </div>
      )}
      {!farm.loading && !farm.error && data && !data.lands.length && (
        <div className={styles.feedback}>
          <Sprout size={32} />
          <p>暂时没有地块，请刷新同步农场。</p>
          <Button variant="secondary" onClick={farm.refresh}>
            刷新田地
          </Button>
        </div>
      )}
      {data && data.lands.length > 0 && (
        <FarmScene
          lands={data.lands}
          crops={data.crops}
          now={farm.now}
          disabled={disabled}
          onLand={(l, trigger) => {
            returnFocus.current = trigger;
            if (!friend && isMature(l, farm.now)) void farm.act('harvest', [l.id]);
            else setSelected(l.id);
          }}
        />
      )}
      <footer className={styles.legend}>
        <span>点选田地进行播种、浇水或收获</span>
        <span>农场进度保存在账号中</span>
      </footer>
      {land && (
        <LandDialog
          land={land}
          returnFocusRef={returnFocus}
          now={farm.now}
          visiting={!!friend}
          level={data!.farmer.level}
          balance={data!.balance}
          busy={farm.busy}
          onClose={() => setSelected(null)}
          onPlant={() => {
            setSelected(null);
            setPlantIds([land.id]);
          }}
          onAction={(action) => farm.act(action, [land.id])}
        />
      )}
      {plantIds && data && (
        <SeedDialog
          crops={data.crops}
          returnFocusRef={returnFocus}
          count={plantIds.length}
          balance={data.balance}
          level={data.farmer.level}
          busy={farm.busy}
          onClose={() => setPlantIds(null)}
          onPlant={(id) => farm.act('plant', plantIds, id)}
        />
      )}
      {social && (
        <FarmSocial
          service={service}
          kind={social}
          farmer={data?.farmer}
          now={farm.now}
          onKindChange={setSocial}
          onClose={() => setSocial(null)}
          onVisit={(f) => {
            setSocial(null);
            onVisit(f);
          }}
        />
      )}
    </div>
  );
}
