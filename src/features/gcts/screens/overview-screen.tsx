import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppPage } from '@/features/gcts/components/app-page';
import { BinCard } from '@/features/gcts/components/bin-card';
import { GctsIcon, type GctsIconName } from '@/features/gcts/components/gcts-icon';
import { demoBins } from '@/features/gcts/data/demo-bins';
import { getBinUrgency } from '@/features/gcts/domain/bin';
import { useDemoRole } from '@/features/gcts/state/demo-role-context';
import { palette } from '@/features/gcts/palette';
import { useResponsiveWidth } from '@/features/gcts/hooks/use-responsive-width';

const collectorBinIds = new Set(['central-market', 'mpanga-market', 'kabundaire-market']);

const roleCopy = {
  admin: {
    eyebrow: 'CITY OPERATIONS',
    title: 'City overview',
    subtitle: 'Waste collection activity across the pilot area.',
  },
  supervisor: {
    eyebrow: 'OPERATIONS OVERVIEW',
    title: 'Good morning',
    subtitle: 'Here is the current picture across Central and North Divisions.',
  },
  collector: {
    eyebrow: 'YOUR COLLECTION WORK',
    title: 'Your route preview',
    subtitle: 'Review assigned stops and collection priorities.',
  },
  resident: {
    eyebrow: 'RESIDENT SERVICES',
    title: 'Fort Portal services',
    subtitle: 'Check public bin information, service updates, and ways to report an issue.',
  },
} as const;

export function OverviewScreen() {
  const { role, residentReports } = useDemoRole();
  const width = useResponsiveWidth();
  const wideWeb = Platform.OS === 'web' && width >= 1100;
  const wideAdmin = wideWeb && role === 'admin';
  const visibleBins =
    role === 'collector' ? demoBins.filter((bin) => collectorBinIds.has(bin.id)) : demoBins;
  const dueBins = visibleBins.filter((bin) => getBinUrgency(bin.fillLevelPercent) === 'collection_due');
  const nearlyFullBins = visibleBins.filter(
    (bin) => getBinUrgency(bin.fillLevelPercent) === 'nearly_full'
  );
  const divisionSummaries = ['Central Division', 'North Division'].map((division) => {
    const bins = visibleBins.filter((bin) => bin.division === division);
    const due = bins.filter((bin) => getBinUrgency(bin.fillLevelPercent) === 'collection_due');
    return { name: division, total: bins.length, due: due.length };
  });

  return (
    <AppPage {...roleCopy[role]}>
      <View style={[styles.statsGrid, wideWeb && styles.statsGridWide]}>
        <StatCard
          label={role === 'resident' ? 'Public bins' : 'Bins in view'}
          value={String(visibleBins.length)}
          detail="Locations"
          icon="bins"
          wide={wideWeb}
        />
        <StatCard
          label={role === 'resident' ? 'Need attention' : 'Collection due'}
          value={String(dueBins.length)}
          detail="Priority collection"
          tone="red"
          icon="priority"
          wide={wideWeb}
        />
        <StatCard
          label="Nearly full"
          value={String(nearlyFullBins.length)}
          detail="Review soon"
          tone="amber"
          icon="nearlyFull"
          wide={wideWeb}
        />
        <StatCard
          label={role === 'resident' ? 'My reports' : 'Active routes'}
          value={role === 'resident' ? String(residentReports.length) : '1'}
          detail={role === 'resident' ? 'Submitted by you' : 'Assigned route'}
          tone="green"
          icon={role === 'resident' ? 'report' : 'routes'}
          wide={wideWeb}
        />
      </View>

      {wideAdmin && (
        <View style={styles.divisionPanel}>
          <View style={styles.divisionPanelHeading}>
            <View>
              <Text style={styles.sectionTitle}>Division snapshot</Text>
              <Text style={styles.sectionDescription}>
                Bin distribution across the pilot area
              </Text>
            </View>
            <View style={styles.snapshotTag}>
              <Text style={styles.snapshotTagText}>2 divisions</Text>
            </View>
          </View>
          <View style={styles.divisionGrid}>
            {divisionSummaries.map((division) => (
              <View key={division.name} style={styles.divisionCard}>
                <View style={styles.divisionCardTop}>
                  <Text style={styles.divisionName}>{division.name}</Text>
                  <Text style={styles.divisionBinCount}>
                    {division.total} bins
                  </Text>
                </View>
                <View style={styles.divisionStats}>
                  <Text style={styles.divisionDueCount}>{division.due}</Text>
                  <Text style={styles.divisionDueLabel}>collection due</Text>
                </View>
                <View style={styles.divisionTrack}>
                  <View
                    style={[
                      styles.divisionTrackFill,
                      { width: `${division.total ? (division.due / division.total) * 100 : 0}%` },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={[styles.adminWorkspace, wideAdmin && styles.adminWorkspaceWide]}>
        <View style={[styles.priorityColumn, wideAdmin && styles.priorityColumnWide]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                {role === 'resident'
                  ? 'Public bin status'
                  : role === 'collector'
                    ? 'Priority stops'
                    : 'Needs attention'}
              </Text>
              <Text style={styles.sectionDescription}>
                Collection priorities
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.navigate('/bins')}
              style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}>
              <Text style={styles.textActionLabel}>All bins</Text>
              <GctsIcon name="chevron" size={15} color={palette.forestLight} />
            </Pressable>
          </View>

          <View style={styles.binList}>
            {dueBins.slice(0, 3).map((bin) => (
              <BinCard key={bin.id} bin={bin} compact publicView={role === 'resident'} />
            ))}
            {dueBins.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No priority stops</Text>
                <Text style={styles.emptyBody}>Check the bins list for other locations.</Text>
              </View>
            )}
          </View>
        </View>

        {role === 'resident' ? (
          <View style={styles.residentNotice}>
            <Text style={styles.residentNoticeEyebrow}>SERVICE INFORMATION</Text>
            <Text style={styles.residentNoticeTitle}>Schedule and notices</Text>
            <Text style={styles.residentNoticeBody}>
              Find collection schedules, service updates, and ways to get help in your area.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.navigate('/resident')}
              style={styles.residentAction}>
              <Text style={styles.residentActionText}>Report an issue</Text>
              <GctsIcon name="forward" size={16} color={palette.forest} />
            </Pressable>
          </View>
        ) : (
          <View style={[styles.routeCard, wideAdmin && styles.routeCardWide]}>
          <View style={styles.routeCardTop}>
            <View style={styles.routeIcon}>
              <GctsIcon name="routes" size={22} color={palette.white} />
            </View>
            <View style={styles.routeSummary}>
              <Text style={styles.routeEyebrow}>DEMO ROUTE</Text>
              <Text style={styles.routeName}>
                {role === 'collector' ? 'My collection route' : 'Central Market Loop'}
              </Text>
              <Text style={styles.routeMeta}>Central Division · 3 stops</Text>
            </View>
            <View style={styles.liveTag}>
              <View style={styles.liveDot} />
              <Text style={styles.liveTagText}>PREVIEW</Text>
            </View>
          </View>
          <View style={styles.routeProgressTrack}>
            <View style={styles.routeProgressFill} />
          </View>
          <View style={styles.routeFooter}>
            <Text style={styles.routeProgressText}>2 of 3 stops remaining</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.navigate('/routes')}
              style={styles.routeAction}>
              <Text style={styles.routeActionText}>View route</Text>
              <GctsIcon name="chevron" size={14} color={palette.white} />
            </Pressable>
          </View>
          </View>
        )}
      </View>

    </AppPage>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  detail: string;
  tone?: 'red' | 'amber' | 'green';
  icon: GctsIconName;
  wide: boolean;
};

function StatCard({ label, value, detail, tone, icon, wide }: StatCardProps) {
  const valueColor = tone === 'red' ? palette.red : tone === 'amber' ? palette.amber : palette.forest;

  return (
    <View style={[styles.statCard, wide && styles.statCardWide]}>
      <View style={styles.statTopRow}>
        <Text style={styles.statLabel}>{label}</Text>
        <View style={styles.statIcon}>
          <GctsIcon name={icon} size={16} color={valueColor} />
        </View>
      </View>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
        <Text style={styles.statDetail}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statsGridWide: {
    flexWrap: 'nowrap',
    gap: 14,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    minHeight: 118,
    padding: 15,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 17,
    backgroundColor: palette.white,
    shadowColor: '#22372C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 5,
    elevation: 1,
  },
  statCardWide: {
    width: '23%',
    minHeight: 128,
  },
  statTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  statValue: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
  },
  statDetail: {
    color: '#8B968F',
    maxWidth: 72,
    marginLeft: 'auto',
    textAlign: 'right',
    fontSize: 9,
  },
  statValueRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F5F1',
  },
  divisionPanel: {
    marginTop: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 18,
    backgroundColor: palette.white,
  },
  divisionPanelHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 14,
  },
  snapshotTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: palette.mint,
  },
  snapshotTagText: {
    color: palette.forest,
    fontSize: 10,
    fontWeight: '700',
  },
  divisionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  divisionCard: {
    flex: 1,
    minWidth: 230,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F7F9F6',
  },
  divisionCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  divisionName: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  divisionBinCount: {
    color: palette.muted,
    fontSize: 10,
  },
  divisionStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 14,
  },
  divisionDueCount: {
    color: palette.red,
    fontSize: 22,
    fontWeight: '800',
  },
  divisionDueLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  divisionTrack: {
    height: 6,
    overflow: 'hidden',
    marginTop: 9,
    borderRadius: 6,
    backgroundColor: '#E8EDE8',
  },
  divisionTrackFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: palette.red,
  },
  adminWorkspace: {
    flexDirection: 'column',
  },
  adminWorkspaceWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 22,
    marginTop: 4,
  },
  priorityColumn: {
    minWidth: 0,
  },
  priorityColumnWide: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 28,
    marginBottom: 12,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  sectionDescription: {
    color: palette.muted,
    fontSize: 11,
    marginTop: 3,
  },
  textAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    padding: 8,
  },
  textActionLabel: {
    color: palette.forestLight,
    fontSize: 12,
    fontWeight: '800',
  },
  binList: {
    gap: 9,
  },
  emptyCard: {
    padding: 18,
    backgroundColor: palette.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyBody: {
    color: palette.muted,
    fontSize: 11,
    marginTop: 4,
  },
  routeCard: {
    marginTop: 22,
    padding: 17,
    borderRadius: 19,
    backgroundColor: palette.forest,
  },
  routeCardWide: {
    width: '38%',
    minWidth: 320,
    marginTop: 28,
    padding: 22,
  },
  routeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  routeIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  routeIconText: {
    color: palette.white,
    fontSize: 22,
  },
  routeSummary: {
    flex: 1,
  },
  routeEyebrow: {
    color: '#B8D7C2',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  routeName: {
    color: palette.white,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 3,
  },
  routeMeta: {
    color: '#C5D8CD',
    fontSize: 10,
    marginTop: 3,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 4,
    backgroundColor: '#F1C06A',
  },
  liveTagText: {
    color: '#E4EEE8',
    fontSize: 8,
    fontWeight: '800',
  },
  routeProgressTrack: {
    height: 5,
    marginTop: 18,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  routeProgressFill: {
    width: '65%',
    height: '100%',
    backgroundColor: '#9CCDAA',
    borderRadius: 6,
  },
  routeFooter: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeProgressText: {
    color: '#D1E1D7',
    fontSize: 10,
  },
  routeAction: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    padding: 4,
  },
  routeActionText: {
    color: palette.white,
    fontSize: 11,
    fontWeight: '800',
  },
  residentNotice: {
    marginTop: 22,
    padding: 17,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 18,
    backgroundColor: palette.white,
  },
  residentNoticeEyebrow: {
    color: palette.forestLight,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  residentNoticeTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6,
  },
  residentNoticeBody: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  residentAction: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: palette.mint,
  },
  residentActionText: {
    color: palette.forest,
    fontSize: 12,
    fontWeight: '800',
  },
  disclaimer: {
    color: '#8B968F',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 18,
    marginBottom: 16,
  },
  pressed: {
    opacity: 0.72,
  },
});
