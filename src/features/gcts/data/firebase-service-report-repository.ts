import { FirebaseError } from 'firebase/app';
import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type Query,
} from 'firebase/firestore';
import type { AuthPrincipal } from '@/features/auth/domain/auth-session';
import {
  type NewServiceReport,
  type ServiceReportStatus,
} from '@/features/gcts/domain/service-report';
import {
  InvalidServiceReportDataError,
  parseServiceReport,
} from '@/features/gcts/data/service-report-mapper';
import {
  ServiceReportRepositoryError,
  type ReportListState,
  type ServiceReportRepository,
} from '@/features/gcts/data/service-report-repository';
import {
  FirebaseConfigurationError,
  getFirebaseFirestore,
} from '@/services/firebase/firebase';

const reportLimit = 50;

export class FirebaseServiceReportRepository
  implements ServiceReportRepository
{
  subscribe(
    principal: AuthPrincipal,
    onStateChange: (state: ReportListState) => void
  ): () => void {
    onStateChange({ status: 'loading' });

    if (principal.role === 'resident' && !principal.emailVerified) {
      onStateChange({
        status: 'permission-denied',
        message: 'Verify your email before viewing service reports.',
      });
      return () => {};
    }

    let reportsQuery: Query<DocumentData>;
    try {
      reportsQuery = buildReportsQuery(principal);
    } catch (error) {
      onStateChange(toListState(error));
      return () => {};
    }

    try {
      return onSnapshot(
        reportsQuery,
        { includeMetadataChanges: true },
        (snapshot) => {
          try {
            const reports = snapshot.docs.map((report) =>
              parseServiceReport(
                report.id,
                report.data({ serverTimestamps: 'estimate' })
              )
            );
            const source = snapshot.metadata.fromCache ? 'cache' : 'server';
            onStateChange(
              reports.length === 0
                ? { status: 'empty', source }
                : { status: 'ready', reports, source }
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

  async create(
    principal: AuthPrincipal,
    report: NewServiceReport
  ): Promise<string> {
    if (principal.role !== 'resident' || !principal.emailVerified) {
      throw new ServiceReportRepositoryError({
        kind: 'permission-denied',
        message: 'A verified resident account is required to submit a report.',
      });
    }

    const validatedReport = validateNewReport(report);
    try {
      const reference = await addDoc(
        collection(getFirebaseFirestore(), 'serviceReports'),
        {
          ...validatedReport,
          residentUid: principal.uid,
          status: 'received',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );
      return reference.id;
    } catch (error) {
      throw toRepositoryError(error);
    }
  }

  async transitionStatus(
    principal: AuthPrincipal,
    reportId: string,
    status: ServiceReportStatus
  ): Promise<void> {
    if (principal.role !== 'admin' && principal.role !== 'supervisor') {
      throw new ServiceReportRepositoryError({
        kind: 'permission-denied',
        message: 'Only administrators and supervisors can review reports.',
      });
    }

    try {
      await updateDoc(
        doc(getFirebaseFirestore(), 'serviceReports', reportId),
        {
          status,
          updatedAt: serverTimestamp(),
        }
      );
    } catch (error) {
      throw toRepositoryError(error);
    }
  }
}

function buildReportsQuery(principal: AuthPrincipal): Query<DocumentData> {
  if (principal.role === 'supervisor') {
    const divisionIds = [...new Set(principal.divisionIds)];
    if (divisionIds.length === 0 || divisionIds.length > 30) {
      throw new ServiceReportRepositoryError({
        kind: 'permission-denied',
        message: 'Supervisor access is missing a valid division scope.',
      });
    }
    const reports = collection(getFirebaseFirestore(), 'serviceReports');
    return query(
      reports,
      where('divisionId', 'in', divisionIds),
      orderBy('createdAt', 'desc'),
      limit(reportLimit)
    );
  }
  if (principal.role === 'admin') {
    const reports = collection(getFirebaseFirestore(), 'serviceReports');
    return query(reports, orderBy('createdAt', 'desc'), limit(reportLimit));
  }
  if (principal.role === 'resident') {
    const reports = collection(getFirebaseFirestore(), 'serviceReports');
    return query(
      reports,
      where('residentUid', '==', principal.uid),
      orderBy('createdAt', 'desc'),
      limit(reportLimit)
    );
  }

  throw new ServiceReportRepositoryError({
    kind: 'permission-denied',
    message: 'Collectors do not have access to resident reports.',
  });
}

function validateNewReport(report: NewServiceReport): NewServiceReport {
  const binId = report.binId.trim();
  const divisionId = report.divisionId.trim();
  const location = report.location.trim();
  const details = report.details.trim();

  if (
    divisionId.length === 0
    || divisionId.length > 64
    || binId.length === 0
    || binId.length > 128
    || location.length === 0
    || location.length > 160
    || details.length === 0
    || details.length > 1000
    || !['overflowing_bin', 'missed_collection'].includes(report.type)
  ) {
    throw new ServiceReportRepositoryError({
      kind: 'invalid-input',
      message: 'The report contains invalid or incomplete fields.',
    });
  }

  return { ...report, binId, divisionId, location, details };
}

function toListState(error: unknown): ReportListState {
  const failure = toRepositoryFailure(error);
  if (failure.kind === 'permission-denied') {
    return { status: 'permission-denied', message: failure.message };
  }
  if (failure.kind === 'offline') {
    return { status: 'offline', message: failure.message };
  }
  return { status: 'error', failure };
}

function toRepositoryError(error: unknown): ServiceReportRepositoryError {
  if (error instanceof ServiceReportRepositoryError) {
    return error;
  }
  return new ServiceReportRepositoryError(toRepositoryFailure(error));
}

function toRepositoryFailure(
  error: unknown
): ServiceReportRepositoryError['failure'] {
  if (error instanceof ServiceReportRepositoryError) {
    return error.failure;
  }
  if (error instanceof InvalidServiceReportDataError) {
    return { kind: 'invalid-data', message: error.message };
  }
  if (error instanceof FirebaseConfigurationError) {
    return { kind: 'configuration', message: error.message };
  }
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied') {
      return {
        kind: 'permission-denied',
        message: 'You do not have permission to access these reports.',
      };
    }
    if (
      error.code === 'unavailable'
      || error.code === 'deadline-exceeded'
      || error.code === 'network-request-failed'
    ) {
      return {
        kind: 'offline',
        message: 'Reports are currently unavailable. Check your connection and try again.',
      };
    }
  }
  return {
    kind: 'unknown',
    message: 'The report request failed. Try again or contact the project administrator.',
  };
}
