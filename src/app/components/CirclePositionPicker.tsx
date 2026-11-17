import { Columns2 } from 'lucide-react';
import { useChatPanelStore } from '@/features/appearance';
import { Select } from '@/shared/ui/Select';

export function CirclePositionPicker({ mobile = false }: { mobile?: boolean }) {
  const position = useChatPanelStore((state) => state.circlePosition);
  const setPosition = useChatPanelStore((state) => state.setCirclePosition);
  return (
    <Select
      label={mobile ? '鱼小圈电脑布局' : '调整鱼小圈布局'}
      value={position}
      options={[
        { value: 'left', label: '聊天室左侧' },
        { value: 'right', label: '聊天室右侧' },
      ]}
      triggerIcon={<Columns2 size={16} aria-hidden="true" />}
      onValueChange={(value) => {
        if (value === 'left' || value === 'right') setPosition(value);
      }}
    />
  );
}
