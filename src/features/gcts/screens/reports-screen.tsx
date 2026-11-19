import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useFirebaseAuth } from '@/features/auth/hooks/use-firebase-auth';
import { AppPage } from '@/features/gcts/components/app-page';
import { GctsIcon } from '@/features/gcts/components/gcts-icon';
import {
  ServiceReportRepositoryError,
  type ReportListState,
} from '@/features/gcts/data/service-report-repository';
import { FirebaseServiceReportRepository } from '@/features/gcts/data/firebase-service-report-repository';
import type { ServiceReport } from '@/features/gcts/domain/service-report';
import {
  useDemoRole,
  type ResidentReport,
  type ResidentReportStatus,
} from '@/features/gcts/state/demo-role-context';
import { palette } from '@/features/gcts/palette';

export type DisplayReport = {
  id: string;
  type: string;
  location: string;
  details: string;
  status: ResidentReportStatus;
  submittedLabel: string;
};

const filters = ['All reports', 'Received', 'Under review', 'Resolved'] as const;
type ReportFilter = (typeof filters)[number];

const statusLabels: Record<ResidentReportStatus, string> = {
  received: 'Received',
  under_review: 'Under review',
  resolved: 'Resolved',
};

const nextStatus: Partial<Record<ResidentReportStatus, ResidentReportStatus>> = {
  received: 'under_review',
  under_review: 'resolved',
};

const firebaseServiceReportRepository = new FirebaseServiceReportRepository();

export function ReportsScreen() {
  const { role: previewRole } = useDemoRole();
  const { session } = useFirebaseAuth();
  const [filter, setFilter] = useState<ReportFilter>('All reports');
  const [reportsState, setReportsState] = useState<ReportListState>({ status: 'loading' });
  const [busyReportId, setBusyReportId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const principal = session.status === 'signed-in' ? session.principal : null;
  const liveMode = principal?.role === 'admin' || principal?.role === 'supervisor';
  const role = principal?.role ?? previewRole;

  useEffect(() => {
    if (!liveMode || !principal) {
      return;
    }
    return firebaseServiceReportRepository.subscribe(principal, setReportsState);
  }, [liveMode, principal]);

  const sourceReports = useMemo(() => {
    if (!liveMode || reportsState.status !== 'ready') {
      return [];
    }
    return reportsState.reports.map(toDisplayReport);
  }, [liveMode, reportsState]);

  const reports = useMemo(
    () =>
      sourceReports.filter((report) => {
        if (filter === 'All reports') return true;
        const status = filter.toLowerCase().replace(' ', '_');
        return report.status === status;
      }),
    [filter, sourceReports]
  );
  const pendingCount = sourceReports.filter((report) => report.status !== 'resolved').length;

  if (session.status === 'loading') {
    return (
      <AppPage eyebrow="SERVICE DESK" title="Resident reports" subtitle="Checking account status.">
        <DataMessage message="Checking account..." />
      </AppPage>
    );
  }
  if (session.status === 'error') {
    return (
      <AppPage eyebrow="SERVICE DESK" title="Resident reports" subtitle="Account status is temporarily unavailable.">
        <DataMessage message={session.failure.message} />
      </AppPage>
    );
  }

  if (!principal) {
    return (
      <AppPage eyebrow="SERVICE DESK" title="Resident reports" subtitle="Staff triage and report follow-up.">
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <GctsIcon name="reports" size={24} />
          </View>
          <Text style={styles.emptyTitle}>Staff Sign In Required</Text>
          <Text style={styles.emptyCopy}>
            Reviewing and transitioning resident service reports is restricted to supervisors and city administrators. Sign in to continue.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.navigate('/settings')}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, { marginTop: 16 }]}>
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </Pressable>
        </View>
      </AppPage>
    );
  }

  async function advanceReport(report: ResidentReport) {
    const status = nextStatus[report.status];
    if (!status || !liveMode || !principal) {
      return;
    }

    setBusyReportId(report.id);
    setActionMessage(null);
    try {
      await firebaseServiceReportRepository.transitionStatus(principal, report.id, status);
    } catch (error) {
      setActionMessage(
        error instanceof ServiceReportRepositoryError
          ? error.failure.message
          : 'The report status could not be updated. Try again.'
      );
    } finally {
      setBusyReportId(null);
    }
  }

  const isOperationsRole = role === 'admin' || role === 'supervisor';

  if (!isOperationsRole) {
    return (
      <AppPage eyebrow="SERVICE REQUESTS" title="My reports" subtitle="Keep track of your collection concerns.">
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <GctsIcon name="reports" size={22} />
          </View>
          <Text style={styles.emptyTitle}>Your reports are in Resident services</Text>
          <Text style={styles.emptyCopy}>Open Report issue to view or submit a service request.</Text>
        </View>
      </AppPage>
    );
  }

  return (
    <AppPage
      eyebrow="SERVICE DESK"
      title="Resident reports"
      subtitle="Review and follow up on collection requests from across the city.">
      {actionMessage && <DataMessage message={actionMessage} />}
      {liveMode && reportsState.status === 'loading' && (
        <DataMessage message="Loading reports..." />
      )}
      {liveMode && reportsState.status === 'permission-denied' && (
        <DataMessage message={reportsState.message} />
      )}
      {liveMode && reportsState.status === 'offline' && (
        <DataMessage message={reportsState.message} />
      )}
      {liveMode && reportsState.status === 'error' && (
        <DataMessage message={reportsState.failure.message} />
      )}
      {liveMode && reportsState.status === 'ready' && reportsState.source === 'cache' && (
        <DataMessage message="Offline mode: showing saved reports." />
      )}
      <View style={styles.summaryRow}>
        <SummaryCard value={String(sourceReports.length)} label="Total reports" icon="reports" />
        <SummaryCard value={String(pendingCount)} label="Needs attention" icon="priority" />
        <SummaryCard
          value={String(sourceReports.filter((report) => report.status === 'resolved').length)}
          label="Resolved"
          icon="available"
        />
      </View>

      <View style={styles.filterRow}>
        {filters.map((item) => {
          const selected = filter === item;
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setFilter(item)}
              style={[styles.filterChip, selected && styles.filterChipSelected]}>
              <Text style={[styles.filterLabel, selected && styles.filterLabelSelected]}>{item}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.reportList}>
        {(!liveMode && reports.length === 0)
          || (liveMode && (
            reportsState.status === 'empty'
            || (reportsState.status === 'ready' && reports.length === 0)
          )) ? (
          <EmptyReports filter={filter} />
        ) : null}
        {reports.length > 0 && (!liveMode || reportsState.status === 'ready') ? (
          reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              disabled={busyReportId === report.id}
              onAdvance={() => void advanceReport(report)}
            />
          ))
        ) : null}
      </View>
    </AppPage>
  );
}

function EmptyReports({ filter }: { filter: ReportFilter }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <GctsIcon name="available" size={22} color={palette.green} />
      </View>
      <Text style={styles.emptyTitle}>
        {filter === 'All reports' ? 'No reports to review' : `No ${filter.toLowerCase()}`}
      </Text>
      <Text style={styles.emptyCopy}>New resident requests will appear here.</Text>
    </View>
  );
}

function DataMessage({
  message,
  tone = 'warning',
}: {
  message: string;
  tone?: 'warning' | 'info';
}) {
  return (
    <View style={[styles.dataMessage, tone === 'info' && styles.dataMessageInfo]}>
      <Text style={[styles.dataMessageText, tone === 'info' && styles.dataMessageInfoText]}>
        {message}
      </Text>
    </View>
  );
}

function toDisplayReport(report: ServiceReport): ResidentReport {
  return {
    id: report.id,
    type: report.type,
    location: report.location,
    details: report.details,
    status: report.status,
    submittedLabel: report.createdAt.toLocaleString(),
  };
}

function SummaryCard({ value, label, icon }: { value: string; label: string; icon: 'reports' | 'priority' | 'available' }) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryTop}>
        <Text style={styles.summaryValue}>{value}</Text>
        <GctsIcon name={icon} size={18} color={palette.forestLight} />
      </View>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function ReportCard({
  report,
  onAdvance,
  disabled,
}: {
  report: ResidentReport;
  onAdvance: () => void;
  disabled: boolean;
}) {
  const next = nextStatus[report.status];
  return (
    <View style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View style={styles.reportTypeRow}>
          <GctsIcon name="report" size={17} color={palette.red} />
          <Text style={styles.reportType}>
            {report.type === 'overflowing_bin' ? 'Overflowing bin' : 'Missed collection'}
          </Text>
        </View>
        <View style={[styles.statusPill, report.status === 'resolved' && styles.statusPillResolved]}>
          <Text style={[styles.statusText, report.status === 'resolved' && styles.statusTextResolved]}>
            {statusLabels[report.status]}
          </Text>
        </View>
      </View>
      <Text style={styles.reportLocation}>{report.location}</Text>
      <Text style={styles.reportDetails}>{report.details}</Text>
      <View style={styles.reportFooter}>
        <Text style={styles.reportTime}>{report.submittedLabel}</Text>
        {next && (
          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            onPress={onAdvance}
            style={({ pressed }) => [
              styles.actionButton,
              disabled && styles.actionButtonDisabled,
              pressed && !disabled && styles.pressed,
            ]}>
            <Text style={styles.actionButtonText}>
              {disabled
                ? 'Updating...'
                : next === 'under_review'
                  ? 'Start review'
                  : 'Mark resolved'}
            </Text>
            <GctsIcon name="chevron" size={14} color={palette.white} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    minWidth: 100,
    minHeight: 88,
    justifyContent: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    backgroundColor: palette.white,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryValue: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: '800',
  },
  summaryLabel: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 22,
    marginBottom: 13,
  },
  filterChip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 20,
    backgroundColor: palette.white,
  },
  filterChipSelected: {
    borderColor: palette.forest,
    backgroundColor: palette.forest,
  },
  filterLabel: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  filterLabelSelected: {
    color: palette.white,
  },
  reportList: {
    gap: 10,
  },
  reportCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 17,
    backgroundColor: palette.white,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  reportTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  reportType: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 18,
    backgroundColor: palette.amberSoft,
  },
  statusPillResolved: {
    backgroundColor: palette.greenSoft,
  },
  statusText: {
    color: palette.amber,
    fontSize: 9,
    fontWeight: '800',
  },
  statusTextResolved: {
    color: palette.green,
  },
  reportLocation: {
    color: palette.forestLight,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
  },
  reportDetails: {
    color: '#59665E',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  reportFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 14,
  },
  reportTime: {
    flex: 1,
    color: palette.muted,
    fontSize: 10,
  },
  actionButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    borderRadius: 11,
    backgroundColor: palette.forest,
  },
  actionButtonText: {
    color: palette.white,
    fontSize: 10,
    fontWeight: '800',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  dataMessage: {
    padding: 11,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: palette.amberSoft,
  },
  dataMessageText: {
    color: palette.amber,
    fontSize: 11,
    lineHeight: 16,
  },
  dataMessageInfo: {
    backgroundColor: palette.mint,
  },
  dataMessageInfoText: {
    color: palette.forest,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    padding: 26,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 17,
    backgroundColor: palette.white,
  },
  emptyIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: palette.mint,
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyCopy: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
    textAlign: 'center',
  },
  primaryButton: {
    minHeight: 44,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: palette.forest,
  },
  primaryButtonText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.78,
  },
});
