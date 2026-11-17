import { FirebaseError } from 'firebase/app';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
  type DocumentData,
  type Query,
} from 'firebase/firestore';

import type { AuthPrincipal } from '@/features/auth/domain/auth-session';
import type { CollectionOutcome } from '@/features/gcts/domain/collection-event';
import {
  InvalidRouteDataError,
  parseCollectionRoute,
} from '@/features/gcts/data/route-mapper';
import {
  RouteRepositoryError,
  type RouteListState,
  type RouteRepository,
} from '@/features/gcts/data/route-repository';
import {
  FirebaseConfigurationError,
  getFirebaseFirestore,
} from '@/services/firebase/firebase';

const routeLimit = 50;

export class FirebaseRouteRepository implements RouteRepository {
  subscribe(
    principal: AuthPrincipal,
    onStateChange: (state: RouteListState) => void
  ): () => void {
    onStateChange({ status: 'loading' });

    let routesQuery: Query<DocumentData>;
    try {
      routesQuery = buildRoutesQuery(principal);
    } catch (error) {
      onStateChange(toListState(error));
      return () => {};
    }

    try {
      return onSnapshot(
        routesQuery,
        { includeMetadataChanges: true },
        (snapshot) => {
          try {
            const routes = snapshot.docs
              .map((docSnap) =>
                parseCollectionRoute(
                  docSnap.id,
                  docSnap.data({ serverTimestamps: 'estimate' })
                )
              )
              .sort((left, right) => left.code.localeCompare(right.code));

            const source = snapshot.metadata.fromCache ? 'cache' : 'server';
            onStateChange(
              routes.length === 0
                ? { status: 'empty', source }
                : { status: 'ready', routes, source }
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

  async assignCollector(
    principal: AuthPrincipal,
    routeId: string,
    collectorUid: string
  ): Promise<void> {
    if (principal.role !== 'admin' && principal.role !== 'supervisor') {
      throw new RouteRepositoryError({
        kind: 'permission-denied',
        message: 'Only supervisors and administrators can assign routes.',
      });
    }

    const trimmedCollectorUid = collectorUid.trim();
    if (trimmedCollectorUid.length === 0 || trimmedCollectorUid.length > 128) {
      throw new RouteRepositoryError({
        kind: 'invalid-input',
        message: 'A valid collector UID is required for assignment.',
      });
    }

    try {
      const db = getFirebaseFirestore();
      const routeRef = doc(db, 'routes', routeId);

      await runTransaction(db, async (transaction) => {
        const routeSnap = await transaction.get(routeRef);
        if (!routeSnap.exists()) {
          throw new RouteRepositoryError({
            kind: 'invalid-data',
            message: `Route "${routeId}" not found.`,
          });
        }

        const data = routeSnap.data();
        if (principal.role === 'supervisor') {
          if (!principal.divisionIds.includes(data.divisionId)) {
            throw new RouteRepositoryError({
              kind: 'permission-denied',
              message: 'Supervisor cannot assign routes outside assigned divisions.',
            });
          }
        }

        const nextStatus = data.status === 'draft' ? 'assigned' : data.status;

        transaction.update(routeRef, {
          collectorUid: trimmedCollectorUid,
          status: nextStatus,
          updatedAt: serverTimestamp(),
        });
      });
    } catch (error) {
      throw toRepositoryError(error);
    }
  }

  async startRoute(principal: AuthPrincipal, routeId: string): Promise<void> {
    if (principal.role !== 'collector' && principal.role !== 'admin' && principal.role !== 'supervisor') {
      throw new RouteRepositoryError({
        kind: 'permission-denied',
        message: 'You do not have permission to start this route.',
      });
    }

    try {
      const db = getFirebaseFirestore();
      const routeRef = doc(db, 'routes', routeId);

      await runTransaction(db, async (transaction) => {
        const routeSnap = await transaction.get(routeRef);
        if (!routeSnap.exists()) {
          throw new RouteRepositoryError({
            kind: 'invalid-data',
            message: `Route "${routeId}" not found.`,
          });
        }

        const data = routeSnap.data();
        if (principal.role === 'collector' && data.collectorUid !== principal.uid) {
          throw new RouteRepositoryError({
            kind: 'permission-denied',
            message: 'You can only start routes assigned to you.',
          });
        }

        if (principal.role === 'supervisor' && !principal.divisionIds.includes(data.divisionId)) {
          throw new RouteRepositoryError({
            kind: 'permission-denied',
            message: 'Supervisor cannot modify routes outside assigned divisions.',
          });
        }

        if (data.status !== 'assigned') {
          throw new RouteRepositoryError({
            kind: 'invalid-input',
            message: `Route cannot be started from "${data.status}" status.`,
          });
        }

        transaction.update(routeRef, {
          status: 'in_progress',
          startedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
    } catch (error) {
      throw toRepositoryError(error);
    }
  }

  async recordStopOutcome(
    principal: AuthPrincipal,
    routeId: string,
    stopIndex: number,
    outcome: CollectionOutcome,
    options?: {
      fillLevelBefore?: number | null;
      fillLevelAfter?: number | null;
      note?: string | null;
    }
  ): Promise<void> {
    if (principal.role !== 'collector' && principal.role !== 'admin' && principal.role !== 'supervisor') {
      throw new RouteRepositoryError({
        kind: 'permission-denied',
        message: 'You do not have permission to record collection outcomes.',
      });
    }

    try {
      const db = getFirebaseFirestore();
      const routeRef = doc(db, 'routes', routeId);
      const eventRef = doc(collection(db, 'collectionEvents'));

      await runTransaction(db, async (transaction) => {
        const routeSnap = await transaction.get(routeRef);
        if (!routeSnap.exists()) {
          throw new RouteRepositoryError({
            kind: 'invalid-data',
            message: `Route "${routeId}" not found.`,
          });
        }

        const routeData = routeSnap.data();
        if (principal.role === 'collector' && routeData.collectorUid !== principal.uid) {
          throw new RouteRepositoryError({
            kind: 'permission-denied',
            message: 'You can only record stops on routes assigned to you.',
          });
        }

        if (principal.role === 'supervisor' && !principal.divisionIds.includes(routeData.divisionId)) {
          throw new RouteRepositoryError({
            kind: 'permission-denied',
            message: 'Supervisor cannot record stops on routes outside assigned divisions.',
          });
        }

        const stops = Array.isArray(routeData.stops) ? [...routeData.stops] : [];
        if (stopIndex < 0 || stopIndex >= stops.length) {
          throw new RouteRepositoryError({
            kind: 'invalid-input',
            message: `Stop index ${stopIndex} is out of bounds.`,
          });
        }

        const currentStop = stops[stopIndex];
        const nowTimestamp = Timestamp.now();

        // Create immutable collectionEvent
        const eventData: Record<string, unknown> = {
          routeId,
          binId: currentStop.binId,
          divisionId: routeData.divisionId,
          vehicleId: routeData.vehicleId,
          collectorUid: principal.uid,
          outcome,
          source: 'manual',
          collectedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        };

        if (typeof options?.fillLevelBefore === 'number') {
          eventData.fillLevelBefore = options.fillLevelBefore;
        }
        if (typeof options?.fillLevelAfter === 'number') {
          eventData.fillLevelAfter = options.fillLevelAfter;
        }
        if (typeof options?.note === 'string' && options.note.trim().length > 0) {
          eventData.note = options.note.trim();
        }

        transaction.set(eventRef, eventData);

        // Update stop in route
        stops[stopIndex] = {
          ...currentStop,
          status: outcome,
          collectedAt: nowTimestamp,
          skipReason: outcome === 'skipped' ? (options?.note?.trim() ?? 'Skipped by collector') : null,
        };

        transaction.update(routeRef, {
          stops,
          updatedAt: serverTimestamp(),
        });
      });
    } catch (error) {
      throw toRepositoryError(error);
    }
  }

  async completeRoute(principal: AuthPrincipal, routeId: string): Promise<void> {
    if (principal.role !== 'collector' && principal.role !== 'admin' && principal.role !== 'supervisor') {
      throw new RouteRepositoryError({
        kind: 'permission-denied',
        message: 'You do not have permission to complete this route.',
      });
    }

    try {
      const db = getFirebaseFirestore();
      const routeRef = doc(db, 'routes', routeId);

      await runTransaction(db, async (transaction) => {
        const routeSnap = await transaction.get(routeRef);
        if (!routeSnap.exists()) {
          throw new RouteRepositoryError({
            kind: 'invalid-data',
            message: `Route "${routeId}" not found.`,
          });
        }

        const data = routeSnap.data();
        if (principal.role === 'collector' && data.collectorUid !== principal.uid) {
          throw new RouteRepositoryError({
            kind: 'permission-denied',
            message: 'You can only complete routes assigned to you.',
          });
        }

        if (principal.role === 'supervisor' && !principal.divisionIds.includes(data.divisionId)) {
          throw new RouteRepositoryError({
            kind: 'permission-denied',
            message: 'Supervisor cannot complete routes outside assigned divisions.',
          });
        }

        if (data.status !== 'in_progress') {
          throw new RouteRepositoryError({
            kind: 'invalid-input',
            message: `Route cannot be completed from "${data.status}" status.`,
          });
        }

        transaction.update(routeRef, {
          status: 'completed',
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
    } catch (error) {
      throw toRepositoryError(error);
    }
  }
}

function buildRoutesQuery(principal: AuthPrincipal): Query<DocumentData> {
  const routesCollection = collection(getFirebaseFirestore(), 'routes');

  if (principal.role === 'admin') {
    return query(routesCollection, limit(routeLimit));
  }

  if (principal.role === 'supervisor') {
    const divisionIds = [...new Set(principal.divisionIds)];
    if (divisionIds.length === 0 || divisionIds.length > 30) {
      throw new RouteRepositoryError({
        kind: 'permission-denied',
        message: 'Supervisor access is missing a valid division scope.',
      });
    }
    return query(
      routesCollection,
      where('divisionId', 'in', divisionIds),
      limit(routeLimit)
    );
  }

  if (principal.role === 'collector') {
    return query(
      routesCollection,
      where('collectorUid', '==', principal.uid),
      limit(routeLimit)
    );
  }

  throw new RouteRepositoryError({
    kind: 'permission-denied',
    message: 'Residents do not have access to operational collection routes.',
  });
}

function toListState(error: unknown): RouteListState {
  const failure = toRepositoryFailure(error);
  if (failure.kind === 'permission-denied') {
    return { status: 'permission-denied', message: failure.message };
  }
  if (failure.kind === 'offline') {
    return { status: 'offline', message: failure.message };
  }
  return { status: 'error', failure };
}

function toRepositoryError(error: unknown): RouteRepositoryError {
  if (error instanceof RouteRepositoryError) {
    return error;
  }
  return new RouteRepositoryError(toRepositoryFailure(error));
}

function toRepositoryFailure(
  error: unknown
): RouteRepositoryError['failure'] {
  if (error instanceof RouteRepositoryError) {
    return error.failure;
  }
  if (error instanceof InvalidRouteDataError) {
    return { kind: 'invalid-data', message: error.message };
  }
  if (error instanceof FirebaseConfigurationError) {
    return { kind: 'configuration', message: error.message };
  }
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied') {
      return {
        kind: 'permission-denied',
        message: 'You do not have permission to access these routes.',
      };
    }
    if (
      error.code === 'unavailable'
      || error.code === 'deadline-exceeded'
      || error.code === 'network-request-failed'
    ) {
      return {
        kind: 'offline',
        message: 'Routes are currently unavailable. Check your connection and try again.',
      };
    }
  }
  return {
    kind: 'unknown',
    message: 'The route request failed. Try again or contact the project administrator.',
  };
}
