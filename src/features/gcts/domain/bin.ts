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
  lastUpdatedLabel: string;
  source: 'simulated' | 'firestore';
};

export const DEMO_PRIORITY_THRESHOLD_PERCENT = 85;
export const DEMO_NEAR_FULL_THRESHOLD_PERCENT = 75;

export function getBinUrgency(fillLevelPercent: number | null): BinUrgency {
  if (fillLevelPercent === null) {
    return 'unknown';
  }
  if (fillLevelPercent >= DEMO_PRIORITY_THRESHOLD_PERCENT) {
    return 'collection_due';
  }
  if (fillLevelPercent >= DEMO_NEAR_FULL_THRESHOLD_PERCENT) {
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
