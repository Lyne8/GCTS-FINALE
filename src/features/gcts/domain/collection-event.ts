export type CollectionOutcome = 'collected' | 'skipped';

export type CollectionEvent = {
  id: string;
  routeId: string;
  binId: string;
  divisionId: string;
  vehicleId: string;
  collectorUid: string;
  outcome: CollectionOutcome;
  collectedAt: Date;
  source: 'manual';
  fillLevelBefore: number | null;
  fillLevelAfter: number | null;
  note: string | null;
  createdAt: Date;
};

export type NewCollectionEvent = {
  routeId: string;
  binId: string;
  divisionId: string;
  vehicleId: string;
  collectorUid: string;
  outcome: CollectionOutcome;
  fillLevelBefore?: number | null;
  fillLevelAfter?: number | null;
  note?: string | null;
};
