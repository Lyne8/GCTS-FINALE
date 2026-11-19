import { Timestamp } from 'firebase/firestore';
import {
  calculateRouteProgress,
  type CollectionRoute,
  type RouteStatus,
  type RouteStop,
  type StopStatus,
} from '@/features/gcts/domain/route';

export class InvalidRouteDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRouteDataError';
  }
}

const routeStatuses = new Set<string>([
  'draft',
  'assigned',
  'in_progress',
  'completed',
  'cancelled',
]);

const stopStatuses = new Set<string>(['pending', 'collected', 'skipped']);

export function parseCollectionRoute(id: string, value: unknown): CollectionRoute {
  if (!isRecord(value)) {
    throw new InvalidRouteDataError(`Route "${id}" is not a document object.`);
  }

  const {
    code,
    name,
    divisionId,
    vehicleId,
    status,
    stops,
    createdAt,
    updatedAt,
  } = value;

  // Optional fields — treat undefined (missing from Firestore) as null
  const collectorUid = value.collectorUid ?? null;
  const scheduledAt = value.scheduledAt ?? null;
  const startedAt = value.startedAt ?? null;
  const completedAt = value.completedAt ?? null;

  if (
    typeof code !== 'string'
    || code.length === 0
    || code.length > 32
    || typeof name !== 'string'
    || name.length === 0
    || name.length > 100
    || typeof divisionId !== 'string'
    || divisionId.length === 0
    || divisionId.length > 64
    || typeof vehicleId !== 'string'
    || vehicleId.length === 0
    || vehicleId.length > 64
    || (collectorUid !== null && typeof collectorUid !== 'string')
    || (typeof collectorUid === 'string' && (collectorUid.length === 0 || collectorUid.length > 128))
    || !isRouteStatus(status)
    || !Array.isArray(stops)
    || !(createdAt instanceof Timestamp)
    || !(updatedAt instanceof Timestamp)
  ) {
    throw new InvalidRouteDataError(`Route "${id}" contains invalid or incomplete fields.`);
  }

  const parsedStops = stops.map((stop, index) => parseRouteStop(id, stop, index));

  return {
    id,
    code,
    name,
    divisionId,
    vehicleId,
    collectorUid: typeof collectorUid === 'string' ? collectorUid : null,
    status,
    stops: parsedStops,
    progressPercent: calculateRouteProgress(parsedStops),
    scheduledAt: scheduledAt instanceof Timestamp ? scheduledAt.toDate() : null,
    startedAt: startedAt instanceof Timestamp ? startedAt.toDate() : null,
    completedAt: completedAt instanceof Timestamp ? completedAt.toDate() : null,
    createdAt: createdAt.toDate(),
    updatedAt: updatedAt.toDate(),
  };
}

function parseRouteStop(routeId: string, value: unknown, index: number): RouteStop {
  if (!isRecord(value)) {
    throw new InvalidRouteDataError(
      `Stop at index ${index} in route "${routeId}" is not an object.`
    );
  }

  const { binId, name, status, collectedAt, skipReason } = value;

  if (
    typeof binId !== 'string'
    || binId.length === 0
    || binId.length > 128
    || typeof name !== 'string'
    || name.length === 0
    || name.length > 160
    || !isStopStatus(status)
    || (collectedAt !== undefined && collectedAt !== null && !(collectedAt instanceof Timestamp))
    || (skipReason !== undefined && skipReason !== null && typeof skipReason !== 'string')
  ) {
    throw new InvalidRouteDataError(
      `Stop at index ${index} in route "${routeId}" has invalid fields.`
    );
  }

  return {
    binId,
    name,
    status,
    collectedAt: collectedAt instanceof Timestamp ? collectedAt.toDate() : null,
    skipReason: typeof skipReason === 'string' ? skipReason : null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRouteStatus(value: unknown): value is RouteStatus {
  return typeof value === 'string' && routeStatuses.has(value);
}

function isStopStatus(value: unknown): value is StopStatus {
  return typeof value === 'string' && stopStatuses.has(value);
}
