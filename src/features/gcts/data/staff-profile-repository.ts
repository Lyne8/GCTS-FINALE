import type { StaffProfile } from '@/features/gcts/domain/staff-profile';

export type StaffProfileState =
  | { status: 'loading' }
  | { status: 'ready'; profiles: Record<string, StaffProfile>; collectors: StaffProfile[] }
  | { status: 'error'; message: string };

export type SaveStaffInput = {
  email: string;
  displayName: string;
  role: 'collector' | 'supervisor' | 'admin';
  divisionIds?: string[];
};

export interface StaffProfileRepository {
  subscribeStaff(onStateChange: (state: StaffProfileState) => void): () => void;
  saveStaffProfile(input: SaveStaffInput): Promise<void>;
  deleteStaffProfile(docId: string): Promise<void>;
}
