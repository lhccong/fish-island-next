const previews = [
  '需求文档已更新，请查收；评审意见和验收标准已整理到最新版本，方便时一起确认',
  '会议纪要已整理，稍后同步；相关负责人请按排期补充进展、风险和待办事项',
  '本周排期按计划推进',
  '测试反馈已补充到任务单',
  '这部分调整完成后再一起确认',
  '收到，我再核对一下数据',
  '下午的评审材料已准备好',
  '相关资料已放到共享目录',
  '明天同步一下项目进度',
  '方案已确认，按当前版本执行',
  '这项问题已记录，今天跟进',
  '请更新一下任务状态',
] as const;

function getHash(id: string): number {
  let hash = 0;
  for (const character of id) hash = (Math.imul(hash, 31) + character.codePointAt(0)!) >>> 0;
  return hash;
}

export function getWorkPreview(id: string): string {
  return previews[getHash(id) % previews.length]!;
}

export function hasCamouflageDot(id: string): boolean {
  return getHash(id) % 6 === 0;
}
