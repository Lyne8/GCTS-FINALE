export type BinUrgency =
  | 'collection_due'
  | 'nearly_full'
  | 'available'
  | 'unknown';

export type WasteBin = {
  id: string;
  code: string;
  name: string;
  divisionId: string;
  division: string;
  fillLevelPercent: number | null;
  lastReadingAt: Date | null;
  lastUpdatedLabel: string;
  source: 'simulated' | 'firestore';
  latitude?: number | null;
  longitude?: number | null;
};

export const PRIORITY_THRESHOLD_PERCENT = 85;
export const NEAR_FULL_THRESHOLD_PERCENT = 75;
/** Readings older than this are treated as stale and urgency is downgraded to 'unknown'. */
export const STALE_READING_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours

/** @deprecated Use PRIORITY_THRESHOLD_PERCENT */
export const DEMO_PRIORITY_THRESHOLD_PERCENT = PRIORITY_THRESHOLD_PERCENT;
/** @deprecated Use NEAR_FULL_THRESHOLD_PERCENT */
export const DEMO_NEAR_FULL_THRESHOLD_PERCENT = NEAR_FULL_THRESHOLD_PERCENT;

export function isReadingStale(lastReadingAt: Date | null): boolean {
  if (lastReadingAt === null) return true;
  return Date.now() - lastReadingAt.getTime() > STALE_READING_THRESHOLD_MS;
}

export function getBinUrgency(
  fillLevelPercent: number | null,
  lastReadingAt: Date | null,
): BinUrgency {
  if (fillLevelPercent === null || isReadingStale(lastReadingAt)) {
    return 'unknown';
  }
  if (fillLevelPercent >= PRIORITY_THRESHOLD_PERCENT) {
    return 'collection_due';
  }
  if (fillLevelPercent >= NEAR_FULL_THRESHOLD_PERCENT) {
    return 'nearly_full';
  }
  return 'available';
}

export function getBinUrgencyLabel(urgency: BinUrgency): string {
  switch (urgency) {
    case 'collection_due':
      return 'Collection due';
    case 'nearly_full':
      return 'Nearly full';
    case 'available':
      return 'Available';
    case 'unknown':
      return 'No reading';
  }
}
