export type RegionStage = 0 | 1 | 2 | 3; // 0:未发现, 1:发芽中, 2:生长中, 3:丰收中

export interface News {
  id: string;
  t: string;
  tag: string;
  c: string;
  region: string;
  read?: boolean;
}

export interface Region {
  id: number;
  name: string;
  short: string;
  /** 0–100，地区村庄成长，非全局资源 */
  growthProgress: number;
  /** 对该地区相关带地点稿件的阅读关注计数 */
  followCount: number;
  mx: number;
  my: number;
  desc: string;
  news: News[];
}

export interface Task {
  id: number;
  t: string;
  reward: string;
  done: boolean;
  ic: string;
  /** daily：仅引导打卡；challenge：乡土线索，结算发芽值与地区进度 */
  type: 'daily' | 'challenge';
  val: number;
}

export interface Specialty {
  id: string;
  name: string;
  image: string;
  type: 'product' | 'badge' | 'postcard';
  desc?: string;
}

export interface UserStats {
  /** 全局：阅读积累 → 小禾苗阶段、观察员等级 */
  seenValue: number;
  /** 全局：持续关注土地后的深度成长 → 地区权益、图鉴等 */
  sproutValue: number;
}

export interface ArticleBodyItem {
  type: 'text' | 'img' | 'quote';
  text?: string;
  src?: string;
  alt?: string;
}

export interface Article {
  title: string;
  author: string;
  time: string;
  region: string;
  readMin: number;
  body: ArticleBodyItem[];
}
