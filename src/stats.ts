import type { RegionStage } from './types';
import { ARTICLES, ARTICLE_REGION_BY_ID } from './constants';

/** 地区村庄成长阶段（由 growthProgress 推导） */
export function growthProgressToStage(p: number): RegionStage {
  if (p <= 0) return 0;
  if (p < 30) return 1;
  if (p < 70) return 2;
  return 3;
}

export type SproutPhase = '抽芽期' | '长叶期' | '小穗期';

/** 小禾苗阶段（由见闻值 seenValue 决定） */
export function seenValueToSproutPhase(s: number): SproutPhase {
  if (s < 20) return '抽芽期';
  if (s < 50) return '长叶期';
  return '小穗期';
}

/** 振兴观察员等级（由见闻值决定） */
export function seenValueToObserverLevel(s: number): 1 | 2 | 3 {
  if (s < 20) return 1;
  if (s < 50) return 2;
  return 3;
}

export function sproutPhaseEmoji(phase: SproutPhase): string {
  if (phase === '抽芽期') return '🌱';
  if (phase === '长叶期') return '🌿';
  return '🌾';
}

/** 当前阶段内进度条 0–100（见闻值驱动小禾苗） */
export function seenValueTierProgress(seen: number): number {
  if (seen < 20) return Math.min(100, (seen / 20) * 100);
  if (seen < 50) return Math.min(100, ((seen - 20) / 30) * 100);
  return 100;
}

export function resolveArticleRegionName(articleId: string | null): string | null {
  if (!articleId) return null;
  const a = ARTICLES[articleId];
  if (a?.region && a.region !== '乡土中国') return a.region;
  return ARTICLE_REGION_BY_ID[articleId] ?? null;
}
