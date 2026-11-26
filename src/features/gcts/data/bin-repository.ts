import type { AuthPrincipal } from '@/features/auth/domain/auth-session';
import type { WasteBin } from '@/features/gcts/domain/bin';

export type BinRepositoryFailureKind =
  | 'configuration'
  | 'invalid-data'
  | 'permission-denied'
  | 'offline'
  | 'unknown';

export type BinRepositoryFailure = {
  kind: BinRepositoryFailureKind;
  message: string;
};

export class BinRepositoryError extends Error {
  constructor(readonly failure: BinRepositoryFailure) {
    super(failure.message);
    this.name = 'BinRepositoryError';
  }
}

export type BinListState =
  | { status: 'loading' }
  | { status: 'empty'; source: 'cache' | 'server' }
  | { status: 'ready'; bins: WasteBin[]; source: 'cache' | 'server' }
  | { status: 'permission-denied'; message: string }
  | { status: 'offline'; message: string }
  | { status: 'error'; failure: BinRepositoryFailure };

export type CreateBinInput = {
  id?: string;
  code: string;
  name: string;
  divisionId: string;
  latitude?: number | null;
  longitude?: number | null;
  deviceKey?: string;
};

export type UpdateBinInput = {
  code?: string;
  name?: string;
  divisionId?: string;
  latitude?: number | null;
  longitude?: number | null;
  deviceKey?: string;
};

export interface BinRepository {
  subscribe(
    principal: AuthPrincipal,
    onStateChange: (state: BinListState) => void
  ): () => void;
  createBin(input: CreateBinInput): Promise<string>;
  updateBin(id: string, input: UpdateBinInput): Promise<void>;
  deleteBin(id: string): Promise<void>;
}
