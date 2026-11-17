import { Timestamp } from 'firebase/firestore';
import type { WasteBin } from '@/features/gcts/domain/bin';

export class InvalidBinDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidBinDataError';
  }
}

const divisionLabels: Record<string, string> = {
  central: 'Central Division',
  north: 'North Division',
};

export function parseFirebaseBin(id: string, value: unknown): WasteBin {
  if (!isRecord(value)) {
    throw new InvalidBinDataError(`Bin "${id}" is not a document object.`);
  }

  const { code, name, divisionId, reportingEnabled, fillLevelPercent, lastReadingAt } = value;
  if (
    typeof code !== 'string'
    || code.length === 0
    || code.length > 64
    || typeof name !== 'string'
    || name.length === 0
    || name.length > 160
    || typeof divisionId !== 'string'
    || divisionId.length === 0
    || divisionId.length > 64
    || reportingEnabled !== true
    || (
      fillLevelPercent !== undefined
      && (
        typeof fillLevelPercent !== 'number'
        || !Number.isFinite(fillLevelPercent)
        || fillLevelPercent < 0
        || fillLevelPercent > 100
      )
    )
    || (
      lastReadingAt !== undefined
      && !(lastReadingAt instanceof Timestamp)
    )
  ) {
    throw new InvalidBinDataError(`Bin "${id}" contains invalid or incomplete fields.`);
  }

  const readingAt = lastReadingAt instanceof Timestamp
    ? lastReadingAt.toDate()
    : null;

  return {
    id,
    code,
    name,
    divisionId,
    division: divisionLabels[divisionId] ?? divisionId,
    fillLevelPercent:
      typeof fillLevelPercent === 'number' ? fillLevelPercent : null,
    lastUpdatedLabel: readingAt
      ? `Reading · ${readingAt.toLocaleString()}`
      : 'No sensor reading',
    source: 'firestore',
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
