const keywords = ['开心', '大笑', '加油', '无语', '震惊', '委屈', '点赞', '得意'] as const;

export type BigFishEmoticonKeyword = (typeof keywords)[number];

export function parseBigFishEmoticonKeyword(value: unknown): BigFishEmoticonKeyword | undefined {
  return keywords.find((keyword) => keyword === value);
}
