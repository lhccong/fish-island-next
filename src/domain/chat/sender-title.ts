// Public ID/name compatibility data from the legacy client's config/titles.json.
// Unknown/custom IDs remain explicit until the server publishes a public catalogue.
const titleNames: Readonly<Record<string, string>> = {
  '-1': '摸鱼监督员',
  '1': '天使投资人',
  '2': '首席摸鱼官',
  '3': '白金摸鱼官',
  '4': '梦幻摸鱼官',
  '5': '摸鱼共建者',
  '6': '摸鱼行刑官',
  '7': '电玩少女',
  '8': '摸鱼点子王',
  '9': '摸鱼大法师',
  '10': '入机王',
  '11': '汉堡大王',
  '12': '摸鱼铲屎官',
  '13': '查无此人',
  '14': '喂鱼大师',
  '15': '恐龙专属称号',
  '16': '摸鱼精灵王',
  '17': '云朵摸鱼崽',
  '18': '摸鱼智多星',
  '19': '犯困嫌疑人',
  '20': '闲人一个',
  '21': '心转手上层巅峰',
  '22': 'kuzwlu',
  '23': '中国 NPC',
  '24': '897 福报者',
  '25': '划水新秀',
  '26': '牛牛专属',
  '27': '青丝专属',
  '28': '魔丸专属',
  '29': '明天专属',
  '30': '果盘专属',
  '31': '闪耀永恒岛民',
  '32': '瘸子专属',
  '33': '金牌洗浴技师',
  '34': '鱼和牛马专属',
  '35': '关注塔菲喵专属',
};
const levelNames = [
  '划水新秀',
  '划水新秀',
  '摸鱼学徒',
  '水群达人',
  '摸鱼专家',
  '摆烂大师',
  '躺平宗师',
  '摸鱼真人',
  '摸鱼尊者',
  '摸鱼仙君',
  '摸鱼圣人',
  '摸鱼天尊',
  '摸鱼祖师',
];
export function senderTitle(titleId: string | undefined, level: number | undefined): string {
  if (titleId && titleId !== '0')
    return Object.hasOwn(titleNames, titleId) ? titleNames[titleId]! : '称号未收录';
  if (level === undefined) return '称号未提供';
  if ([14, 15, 16, 17].includes(level)) return '摸鱼皇帝';
  return levelNames[level] ?? `等级 ${level}`;
}
