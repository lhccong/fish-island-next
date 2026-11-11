/** 特别鸣谢分组 */
export const SpecialThanksGroup = {
  G1: 1,
  G2: 2,
} as const;
export type SpecialThanksGroup = (typeof SpecialThanksGroup)[keyof typeof SpecialThanksGroup];

/** 特别鸣谢 */
export type SpecialThanks = {
  /** 特别鸣谢分组 */
  readonly group: SpecialThanksGroup;
  /** 名字 */
  readonly name: string;
  /** 喊话 */
  readonly comment?: string;
  /** 颜色 */
  readonly color?: string;
};
