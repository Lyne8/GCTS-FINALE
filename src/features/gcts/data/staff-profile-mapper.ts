import type { StaffProfile } from '@/features/gcts/domain/staff-profile';

export class InvalidStaffProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStaffProfileError';
  }
}

export function parseStaffProfile(uid: string, data: unknown): StaffProfile {
  if (!data || typeof data !== 'object') {
    throw new InvalidStaffProfileError(`Staff profile ${uid} data is not an object.`);
  }

  const record = data as Record<string, unknown>;

  if (typeof record.displayName !== 'string' || record.displayName.trim().length === 0) {
    throw new InvalidStaffProfileError(`Staff profile ${uid} missing valid displayName.`);
  }

  if (typeof record.email !== 'string' || record.email.trim().length === 0) {
    throw new InvalidStaffProfileError(`Staff profile ${uid} missing valid email.`);
  }

  if (
    record.role !== 'collector' &&
    record.role !== 'supervisor' &&
    record.role !== 'admin'
  ) {
    throw new InvalidStaffProfileError(`Staff profile ${uid} has invalid role: ${String(record.role)}`);
  }

  let divisionIds: string[] | undefined;
  if (Array.isArray(record.divisionIds)) {
    divisionIds = record.divisionIds.filter(
      (id): id is string => typeof id === 'string' && id.trim().length > 0
    );
  }

  const resolvedUid =
    typeof record.uid === 'string' && record.uid.trim().length > 0
      ? record.uid.trim()
      : uid;

  return {
    uid: resolvedUid,
    displayName: record.displayName.trim(),
    email: record.email.trim(),
    role: record.role,
    ...(divisionIds ? { divisionIds } : {}),
  };
}
