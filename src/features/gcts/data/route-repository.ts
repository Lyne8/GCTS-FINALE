import type { AuthPrincipal } from '@/features/auth/domain/auth-session';
import type { CollectionOutcome } from '@/features/gcts/domain/collection-event';
import type { CollectionRoute } from '@/features/gcts/domain/route';

export type RouteRepositoryFailureKind =
  | 'configuration'
  | 'invalid-data'
  | 'invalid-input'
  | 'permission-denied'
  | 'offline'
  | 'unknown';

export type RouteRepositoryFailure = {
  kind: RouteRepositoryFailureKind;
  message: string;
};

export class RouteRepositoryError extends Error {
  constructor(readonly failure: RouteRepositoryFailure) {
    super(failure.message);
    this.name = 'RouteRepositoryError';
  }
}

export type RouteListState =
  | { status: 'loading' }
  | { status: 'empty'; source: 'cache' | 'server' }
  | { status: 'ready'; routes: CollectionRoute[]; source: 'cache' | 'server' }
  | { status: 'permission-denied'; message: string }
  | { status: 'offline'; message: string }
  | { status: 'error'; failure: RouteRepositoryFailure };

export type CreateRouteStopInput = {
  binId: string;
  name: string;
};

export type CreateRouteInput = {
  code: string;
  name: string;
  divisionId: string;
  vehicleId: string;
  collectorUid?: string | null;
  stops: CreateRouteStopInput[];
};

export interface RouteRepository {
  subscribe(
    principal: AuthPrincipal,
    onStateChange: (state: RouteListState) => void
  ): () => void;

  createRoute(
    principal: AuthPrincipal,
    input: CreateRouteInput
  ): Promise<string>;

  assignCollector(
    principal: AuthPrincipal,
    routeId: string,
    collectorUid: string
  ): Promise<void>;

  startRoute(
    principal: AuthPrincipal,
    routeId: string
  ): Promise<void>;

  recordStopOutcome(
    principal: AuthPrincipal,
    routeId: string,
    stopIndex: number,
    outcome: CollectionOutcome,
    options?: {
      fillLevelBefore?: number | null;
      fillLevelAfter?: number | null;
      note?: string | null;
    }
  ): Promise<void>;

  completeRoute(
    principal: AuthPrincipal,
    routeId: string
  ): Promise<void>;
}
