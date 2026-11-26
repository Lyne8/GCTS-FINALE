import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
} from 'firebase/firestore';

import {
  parseStaffProfile,
} from '@/features/gcts/data/staff-profile-mapper';
import type {
  SaveStaffInput,
  StaffProfileRepository,
  StaffProfileState,
} from '@/features/gcts/data/staff-profile-repository';
import type { StaffProfile } from '@/features/gcts/domain/staff-profile';
import { getFirebaseFirestore } from '@/services/firebase/firebase';

export class FirebaseStaffProfileRepository implements StaffProfileRepository {
  subscribeStaff(onStateChange: (state: StaffProfileState) => void): () => void {
    onStateChange({ status: 'loading' });

    let firestore;
    try {
      firestore = getFirebaseFirestore();
    } catch (error) {
      onStateChange({
        status: 'error',
        message: error instanceof Error ? error.message : 'Firestore is not configured.',
      });
      return () => {};
    }

    const profilesQuery = query(collection(firestore, 'staffProfiles'));

    return onSnapshot(
      profilesQuery,
      (snapshot) => {
        const profiles: Record<string, StaffProfile> = {};
        const collectors: StaffProfile[] = [];

        for (const docSnapshot of snapshot.docs) {
          try {
            const profile = parseStaffProfile(docSnapshot.id, docSnapshot.data());
            profiles[profile.uid] = profile;
            if (profile.role === 'collector') {
              collectors.push(profile);
            }
          } catch {
            // Ignore malformed profiles without breaking the entire list
          }
        }

        onStateChange({
          status: 'ready',
          profiles,
          collectors,
        });
      },
      (error) => {
        onStateChange({
          status: 'error',
          message: error.message ?? 'Failed to load staff profiles.',
        });
      }
    );
  }

  async saveStaffProfile(input: SaveStaffInput): Promise<void> {
    const firestore = getFirebaseFirestore();
    const cleanEmail = input.email.trim().toLowerCase();
    const docRef = doc(firestore, 'staffProfiles', cleanEmail);

    await setDoc(
      docRef,
      {
        displayName: input.displayName.trim(),
        email: cleanEmail,
        role: input.role,
        ...(input.divisionIds && input.divisionIds.length > 0
          ? { divisionIds: input.divisionIds }
          : { divisionIds: [] }),
      },
      { merge: true }
    );
  }

  async deleteStaffProfile(docId: string): Promise<void> {
    const firestore = getFirebaseFirestore();
    const docRef = doc(firestore, 'staffProfiles', docId);
    await deleteDoc(docRef);
  }
}
