import type { AuthPrincipal } from '@/features/auth/domain/auth-session';
import type {
  NewServiceReport,
  ServiceReport,
  ServiceReportStatus,
} from '@/features/gcts/domain/service-report';

export type ReportRepositoryFailureKind =
  | 'configuration'
  | 'invalid-data'
  | 'invalid-input'
  | 'permission-denied'
  | 'offline'
  | 'unknown';

export type ReportRepositoryFailure = {
  kind: ReportRepositoryFailureKind;
  message: string;
};

export class ServiceReportRepositoryError extends Error {
  constructor(readonly failure: ReportRepositoryFailure) {
    super(failure.message);
    this.name = 'ServiceReportRepositoryError';
  }
}

export type ReportListState =
  | { status: 'loading' }
  | { status: 'empty'; source: 'cache' | 'server' }
  | {
      status: 'ready';
      reports: ServiceReport[];
      source: 'cache' | 'server';
    }
  | { status: 'permission-denied'; message: string }
  | { status: 'offline'; message: string }
  | { status: 'error'; failure: ReportRepositoryFailure };

export interface ServiceReportRepository {
  subscribe(
    principal: AuthPrincipal,
    onStateChange: (state: ReportListState) => void
  ): () => void;
  create(
    principal: AuthPrincipal,
    report: NewServiceReport
  ): Promise<string>;
  transitionStatus(
    principal: AuthPrincipal,
    reportId: string,
    status: ServiceReportStatus
  ): Promise<void>;
}
