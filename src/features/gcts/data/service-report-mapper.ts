import { Timestamp } from 'firebase/firestore';
import type {
  ServiceReport,
  ServiceReportStatus,
  ServiceReportType,
} from '@/features/gcts/domain/service-report';

export class InvalidServiceReportDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidServiceReportDataError';
  }
}

const reportTypes = new Set<string>([
  'overflowing_bin',
  'missed_collection',
]);
const reportStatuses = new Set<string>([
  'received',
  'under_review',
  'resolved',
]);

export function parseServiceReport(
  id: string,
  value: unknown
): ServiceReport {
  if (!isRecord(value)) {
    throw new InvalidServiceReportDataError(
      `Report "${id}" is not a document object.`
    );
  }

  const {
    residentUid,
    divisionId,
    binId,
    type,
    location,
    details,
    status,
    createdAt,
    updatedAt,
  } = value;

  if (
    Object.keys(value).some((key) => !reportFields.has(key))
    ||
    typeof residentUid !== 'string'
    || residentUid.length === 0
    || typeof divisionId !== 'string'
    || divisionId.length === 0
    || divisionId.length > 64
    || typeof binId !== 'string'
    || binId.length === 0
    || binId.length > 128
    || !isReportType(type)
    || typeof location !== 'string'
    || location.length === 0
    || location.length > 160
    || typeof details !== 'string'
    || details.length === 0
    || details.length > 1000
    || !isReportStatus(status)
    || !(createdAt instanceof Timestamp)
    || !(updatedAt instanceof Timestamp)
  ) {
    throw new InvalidServiceReportDataError(
      `Report "${id}" contains invalid or incomplete fields.`
    );
  }

  return {
    id,
    residentUid,
    divisionId,
    binId,
    type,
    location,
    details,
    status,
    createdAt: createdAt.toDate(),
    updatedAt: updatedAt.toDate(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isReportType(value: unknown): value is ServiceReportType {
  return typeof value === 'string' && reportTypes.has(value);
}

function isReportStatus(value: unknown): value is ServiceReportStatus {
  return typeof value === 'string' && reportStatuses.has(value);
}

const reportFields = new Set([
  'residentUid',
  'divisionId',
  'binId',
  'type',
  'location',
  'details',
  'status',
  'createdAt',
  'updatedAt',
]);
