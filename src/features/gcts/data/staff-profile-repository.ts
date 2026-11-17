import type { StaffProfile } from '@/features/gcts/domain/staff-profile';

export type StaffProfileState =
  | { status: 'loading' }
  | { status: 'ready'; profiles: Record<string, StaffProfile>; collectors: StaffProfile[] }
  | { status: 'error'; message: string };

export interface StaffProfileRepository {
  subscribeStaff(onStateChange: (state: StaffProfileState) => void): () => void;
}
