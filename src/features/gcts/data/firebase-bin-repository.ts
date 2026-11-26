import { FirebaseError } from 'firebase/app';
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type Query,
} from 'firebase/firestore';

import type { AuthPrincipal } from '@/features/auth/domain/auth-session';
import {
  InvalidBinDataError,
  parseFirebaseBin,
} from '@/features/gcts/data/firebase-bin-mapper';
import {
  BinRepositoryError,
  type BinListState,
  type BinRepository,
  type CreateBinInput,
  type UpdateBinInput,
} from '@/features/gcts/data/bin-repository';
import {
  FirebaseConfigurationError,
  getFirebaseFirestore,
} from '@/services/firebase/firebase';

const binLimit = 100;

export class FirebaseBinRepository implements BinRepository {
  subscribe(
    principal: AuthPrincipal,
    onStateChange: (state: BinListState) => void
  ): () => void {
    onStateChange({ status: 'loading' });

    let binsQuery: Query<DocumentData>;
    try {
      binsQuery = buildBinsQuery(principal);
    } catch (error) {
      onStateChange(toListState(error));
      return () => {};
    }

    try {
      return onSnapshot(
        binsQuery,
        { includeMetadataChanges: true },
        (snapshot) => {
          try {
            const bins = snapshot.docs.map((bin) =>
              parseFirebaseBin(bin.id, bin.data())
            ).sort((left, right) => left.name.localeCompare(right.name));
            const source = snapshot.metadata.fromCache ? 'cache' : 'server';
            onStateChange(
              bins.length === 0
                ? { status: 'empty', source }
                : { status: 'ready', bins, source }
            );
          } catch (error) {
            onStateChange(toListState(error));
          }
        },
        (error) => onStateChange(toListState(error))
      );
    } catch (error) {
      onStateChange(toListState(error));
      return () => {};
    }
  }

  async createBin(input: CreateBinInput): Promise<string> {
    const firestore = getFirebaseFirestore();
    const docId = input.id?.trim() || input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const docRef = doc(firestore, 'bins', docId);

    const data: Record<string, unknown> = {
      code: input.code.trim(),
      name: input.name.trim(),
      divisionId: input.divisionId.trim(),
      reportingEnabled: true,
    };

    if (typeof input.latitude === 'number' && Number.isFinite(input.latitude)) {
      data.latitude = input.latitude;
    }
    if (typeof input.longitude === 'number' && Number.isFinite(input.longitude)) {
      data.longitude = input.longitude;
    }
    if (input.deviceKey && input.deviceKey.trim().length > 0) {
      data.deviceKey = input.deviceKey.trim();
    }

    await setDoc(docRef, data, { merge: true });
    return docId;
  }

  async updateBin(id: string, input: UpdateBinInput): Promise<void> {
    const firestore = getFirebaseFirestore();
    const docRef = doc(firestore, 'bins', id);

    const data: Record<string, unknown> = {};
    if (input.code) data.code = input.code.trim();
    if (input.name) data.name = input.name.trim();
    if (input.divisionId) data.divisionId = input.divisionId.trim();
    if (typeof input.latitude === 'number' && Number.isFinite(input.latitude)) {
      data.latitude = input.latitude;
    }
    if (typeof input.longitude === 'number' && Number.isFinite(input.longitude)) {
      data.longitude = input.longitude;
    }
    if (input.deviceKey !== undefined) {
      data.deviceKey = input.deviceKey.trim();
    }

    await updateDoc(docRef, data);
  }

  async deleteBin(id: string): Promise<void> {
    const firestore = getFirebaseFirestore();
    const docRef = doc(firestore, 'bins', id);
    await deleteDoc(docRef);
  }
}

function buildBinsQuery(principal: AuthPrincipal): Query<DocumentData> {
  const bins = collection(getFirebaseFirestore(), 'bins');
  const commonConstraints = [
    where('reportingEnabled', '==', true),
    limit(binLimit),
  ];

  if (principal.role === 'resident' && principal.emailVerified) {
    return query(bins, ...commonConstraints);
  }
  if (principal.role === 'admin') {
    return query(bins, ...commonConstraints);
  }
  if (principal.role === 'supervisor') {
    const divisionIds = [...new Set(principal.divisionIds)];
    if (divisionIds.length === 0 || divisionIds.length > 30) {
      throw new BinRepositoryError({
        kind: 'permission-denied',
        message: 'Supervisor access is missing a valid division scope.',
      });
    }
    return query(
      bins,
      where('reportingEnabled', '==', true),
      where('divisionId', 'in', divisionIds),
      limit(binLimit)
    );
  }

  throw new BinRepositoryError({
    kind: 'permission-denied',
    message: principal.role === 'resident'
      ? 'Verify your email before viewing bin locations.'
      : 'Collectors do not have permission to browse bins.',
  });
}

function toListState(error: unknown): BinListState {
  const failure = toRepositoryFailure(error);
  if (failure.kind === 'permission-denied') {
    return { status: 'permission-denied', message: failure.message };
  }
  if (failure.kind === 'offline') {
    return { status: 'offline', message: failure.message };
  }
  return { status: 'error', failure };
}

function toRepositoryFailure(error: unknown): BinRepositoryError['failure'] {
  if (error instanceof BinRepositoryError) {
    return error.failure;
  }
  if (error instanceof InvalidBinDataError) {
    return { kind: 'invalid-data', message: error.message };
  }
  if (error instanceof FirebaseConfigurationError) {
    return { kind: 'configuration', message: error.message };
  }
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied') {
      return {
        kind: 'permission-denied',
        message: 'You do not have permission to view these bins.',
      };
    }
    if (
      error.code === 'unavailable'
      || error.code === 'deadline-exceeded'
      || error.code === 'network-request-failed'
    ) {
      return {
        kind: 'offline',
        message: 'Bin locations are unavailable. Check your connection and try again.',
      };
    }
  }
  return {
    kind: 'unknown',
    message: 'Bin locations could not be loaded. Try again or contact the project administrator.',
  };
}
