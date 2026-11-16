import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppPage } from '@/features/gcts/components/app-page';
import { GctsIcon } from '@/features/gcts/components/gcts-icon';
import {
  useDemoRole,
  type ResidentReport,
  type ResidentReportStatus,
} from '@/features/gcts/state/demo-role-context';
import { palette } from '@/features/gcts/palette';

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

export function ReportsScreen() {
  const { role, residentReports, updateResidentReportStatus } = useDemoRole();
  const [filter, setFilter] = useState<ReportFilter>('All reports');
  const isOperationsRole = role === 'admin' || role === 'supervisor';
  const reports = useMemo(
    () =>
      residentReports.filter((report) => {
        if (filter === 'All reports') return true;
        const status = filter.toLowerCase().replace(' ', '_');
        return report.status === status;
      }),
    [filter, residentReports]
  );
  const pendingCount = residentReports.filter((report) => report.status !== 'resolved').length;

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
      <View style={styles.summaryRow}>
        <SummaryCard value={String(residentReports.length)} label="Total reports" icon="reports" />
        <SummaryCard value={String(pendingCount)} label="Needs attention" icon="priority" />
        <SummaryCard
          value={String(residentReports.filter((report) => report.status === 'resolved').length)}
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
        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <GctsIcon name="available" size={22} color={palette.green} />
            </View>
            <Text style={styles.emptyTitle}>
              {filter === 'All reports' ? 'No reports to review' : `No ${filter.toLowerCase()}`}
            </Text>
            <Text style={styles.emptyCopy}>New resident requests will appear here.</Text>
          </View>
        ) : (
          reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onAdvance={() => {
                const status = nextStatus[report.status];
                if (status) updateResidentReportStatus(report.id, status);
              }}
            />
          ))
        )}
      </View>
    </AppPage>
  );
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
}: {
  report: ResidentReport;
  onAdvance: () => void;
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
            onPress={onAdvance}
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
            <Text style={styles.actionButtonText}>
              {next === 'under_review' ? 'Start review' : 'Mark resolved'}
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
  pressed: {
    opacity: 0.78,
  },
});
