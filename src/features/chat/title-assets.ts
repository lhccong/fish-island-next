// Trusted legacy catalogue; never use a URL supplied by a chat message.
interface TitleAsset {
  src: string;
  name: string;
  remote: boolean;
  width: number;
  height: number;
}
const svgTitles: Readonly<Record<string, readonly [string, number, number]>> = {
  '1': ['天使投资人', 71.4, 11.05],
  '2': ['首席摸鱼官', 71.4, 11.05],
  '3': ['白金摸鱼官', 71.4, 11.05],
  '4': ['梦幻摸鱼官', 71.4, 11.05],
  '5': ['摸鱼共建者', 71.4, 11.05],
  '6': ['摸鱼行刑官', 71.4, 11.05],
  '7': ['电玩少女', 62.05, 11.05],
  '8': ['摸鱼点子王', 72.25, 11.05],
  '9': ['摸鱼大法师', 72.25, 11.05],
  '10': ['入机王', 52.7, 11.05],
  '11': ['汉堡大王', 62.05, 11.05],
  '12': ['摸鱼铲屎官', 72.25, 11.05],
  '25': ['划水新秀', 61.2, 11.05],
  '-1': ['摸鱼监督员', 71.4, 11.05],
};
const imageTitles: Readonly<Record<string, readonly [string, string, number]>> = {
  '13': ['Yg2oqPCa-badge-查无此人.png', '查无此人', 53.48],
  '14': ['wZdzS3TT-badge-喂鱼大师.png', '喂鱼大师', 62.44],
  '15': ['恐龙.png', '恐龙专属称号', 50.4],
  '16': ['badge-摸鱼精灵王.png', '摸鱼精灵王', 62.44],
  '17': ['badge-云朵摸鱼崽.png', '云朵摸鱼崽', 62.44],
  '18': ['badge-摸鱼智多星.png', '摸鱼智多星', 62.44],
  '19': ['auxi.jpg', '犯困嫌疑人', 62.44],
  '20': ['土黑娃.png', '闲人一个', 53.48],
  '21': ['badge-心转手上层巅峰.png', '心转手上层巅峰', 53.48],
  '22': ['badge-kuzwlu.png', 'kuzwlu', 62],
  '23': ['npc.png', '中国 NPC', 56.28],
  '24': ['luosi.png', '897 福报者', 63.28],
  '26': ['niuniu.png', '牛牛专属', 51.24],
  '27': ['qingsi.png', '青丝专属', 98.28],
  '28': ['28.png', '魔丸专属', 48],
  '29': ['29.png', '明天专属', 62.4],
  '30': ['30.png', '果盘专属', 72],
  '31': ['闪耀永恒岛民.png', '闪耀永恒岛民', 81.6],
  '32': ['32.png', '瘸子专属', 62.4],
  '33': ['33.png', '金牌洗浴技师', 91.2],
  '34': ['34.png', '鱼和牛马专属', 52.8],
  '35': ['35.png', '关注塔菲喵专属', 91.2],
  '36': ['36.png', '专属称号 36', 62.4],
  '37': ['37.png', '专属称号 37', 125.2],
  '38': ['38.png', '专属称号 38', 62],
  '39': ['39.png', '专属称号 39', 62],
  '40': ['40.png', '专属称号 40', 62],
  '41': ['33.png', '专属称号 41', 91.2],
};
const levelSizes = [
  { width: 61.2, height: 11.05 },
  { width: 61.2, height: 11.05 },
  { width: 61.2, height: 11.05 },
  { width: 61.2, height: 11.05 },
  { width: 61.2, height: 11.05 },
  { width: 61.2, height: 11.05 },
  { width: 61.2, height: 11.05 },
  { width: 62.9, height: 12.75 },
  { width: 62.9, height: 12.75 },
  { width: 62.9, height: 12.75 },
  { width: 62.9, height: 12.75 },
  { width: 61.2, height: 11.05 },
  { width: 62.9, height: 12.75 },
];
const levelNames = [
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
  '摸鱼皇帝',
];
export function titleAsset(
  id: string | undefined,
  level: number | undefined,
): TitleAsset | undefined {
  if (id && id !== '0') {
    if (Object.hasOwn(svgTitles, id)) {
      const [name, width, height] = svgTitles[id]!;
      return { name, width, height, remote: false, src: `/assets/chat-titles/title-${id}.svg` };
    }
    if (Object.hasOwn(imageTitles, id)) {
      const [file, name, width] = imageTitles[id]!;
      return {
        name,
        width,
        height: 14,
        remote: true,
        src: `https://oss.cqbo.com/moyu/title/${file}`,
      };
    }
    return undefined;
  }
  if (level === undefined || !Number.isInteger(level) || level < 0 || level === 13 || level > 17)
    return undefined;
  const index = level >= 14 ? 12 : Math.max(0, level - 1);
  return {
    src: `/assets/chat-titles/level-${index}.svg`,
    name: levelNames[index]!,
    remote: false,
    ...levelSizes[index]!,
  };
}
