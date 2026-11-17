import { Timestamp } from 'firebase/firestore';
import type {
  CollectionEvent,
  CollectionOutcome,
} from '@/features/gcts/domain/collection-event';

export class InvalidCollectionEventDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCollectionEventDataError';
  }
}

const collectionOutcomes = new Set<string>(['collected', 'skipped']);

export function parseCollectionEvent(id: string, value: unknown): CollectionEvent {
  if (!isRecord(value)) {
    throw new InvalidCollectionEventDataError(
      `Collection event "${id}" is not a document object.`
    );
  }

  const {
    routeId,
    binId,
    divisionId,
    vehicleId,
    collectorUid,
    outcome,
    collectedAt,
    source,
    fillLevelBefore,
    fillLevelAfter,
    note,
    createdAt,
  } = value;

  if (
    typeof routeId !== 'string'
    || routeId.length === 0
    || routeId.length > 128
    || typeof binId !== 'string'
    || binId.length === 0
    || binId.length > 128
    || typeof divisionId !== 'string'
    || divisionId.length === 0
    || divisionId.length > 64
    || typeof vehicleId !== 'string'
    || vehicleId.length === 0
    || vehicleId.length > 64
    || typeof collectorUid !== 'string'
    || collectorUid.length === 0
    || collectorUid.length > 128
    || !isCollectionOutcome(outcome)
    || source !== 'manual'
    || !(collectedAt instanceof Timestamp)
    || !(createdAt instanceof Timestamp)
    || (fillLevelBefore !== undefined && fillLevelBefore !== null && typeof fillLevelBefore !== 'number')
    || (fillLevelAfter !== undefined && fillLevelAfter !== null && typeof fillLevelAfter !== 'number')
    || (note !== undefined && note !== null && typeof note !== 'string')
  ) {
    throw new InvalidCollectionEventDataError(
      `Collection event "${id}" contains invalid or incomplete fields.`
    );
  }

  return {
    id,
    routeId,
    binId,
    divisionId,
    vehicleId,
    collectorUid,
    outcome,
    collectedAt: collectedAt.toDate(),
    source: 'manual',
    fillLevelBefore: typeof fillLevelBefore === 'number' ? fillLevelBefore : null,
    fillLevelAfter: typeof fillLevelAfter === 'number' ? fillLevelAfter : null,
    note: typeof note === 'string' ? note : null,
    createdAt: createdAt.toDate(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCollectionOutcome(value: unknown): value is CollectionOutcome {
  return typeof value === 'string' && collectionOutcomes.has(value);
}
