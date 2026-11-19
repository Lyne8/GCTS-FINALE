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

const defaultBinCoordinates: Record<string, { latitude: number; longitude: number }> = {
  'central-market': { latitude: 0.6548, longitude: 30.2743 },
  'mpanga-market': { latitude: 0.6582, longitude: 30.2810 },
  'booma-grounds': { latitude: 0.6505, longitude: 30.2721 },
  'kisenyi-taxi-park': { latitude: 0.6565, longitude: 30.2780 },
  'kabundaire-market': { latitude: 0.6620, longitude: 30.2795 },
  'buhinga-stadium': { latitude: 0.6590, longitude: 30.2690 },
  'nyakaseke-trading-centre': { latitude: 0.6720, longitude: 30.2850 },
  'mmu-lab': { latitude: 0.6385, longitude: 30.2915 },
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

  let latitude: number | null = null;
  let longitude: number | null = null;
  if (typeof value.latitude === 'number' && Number.isFinite(value.latitude)) {
    latitude = value.latitude;
  }
  if (typeof value.longitude === 'number' && Number.isFinite(value.longitude)) {
    longitude = value.longitude;
  }
  if (latitude === null && longitude === null && defaultBinCoordinates[id]) {
    latitude = defaultBinCoordinates[id].latitude;
    longitude = defaultBinCoordinates[id].longitude;
  }

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
    latitude,
    longitude,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
