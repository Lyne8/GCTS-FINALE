import { StyleSheet, Text, View } from 'react-native';

import { AppPage } from '@/features/gcts/components/app-page';
import { palette } from '@/features/gcts/palette';
import { useDemoRole } from '@/features/gcts/state/demo-role-context';

const sampleRoutes = [
  {
    code: 'GCTS-R01',
    name: 'Central Market Loop',
    division: 'Central Division',
    vehicle: 'Truck FP-03',
    status: 'In progress',
    progress: '65%',
    stops: ['Fort Portal Central Market', 'Mpanga Market', 'Kabundaire Market'],
  },
  {
    code: 'GCTS-R02',
    name: 'Kabundaire–Buhinga',
    division: 'North Division',
    vehicle: 'Truck FP-01',
    status: 'Scheduled',
    progress: '0%',
    stops: ['Kabundaire Market', 'Buhinga Stadium', 'Nyakaseke Trading Centre'],
  },
];

export function RoutesScreen() {
  const { role } = useDemoRole();

  if (role === 'resident') {
    return (
      <AppPage
        eyebrow="COLLECTION WORK"
        title="Operational routes"
        subtitle="Route assignments for collection teams."
      />
    );
  }

  return (
    <AppPage
      eyebrow="COLLECTION WORK"
      title="Routes"
      subtitle="Planned and active collection runs across the pilot divisions.">
      <View style={styles.routeList}>
        {sampleRoutes.map((route) => (
          <View key={route.code} style={styles.routeCard}>
            <View style={styles.routeHeading}>
              <View style={styles.routeIdentity}>
                <Text style={styles.routeCode}>{route.code}</Text>
                <Text style={styles.routeName}>{route.name}</Text>
                <Text style={styles.routeDivision}>{route.division}</Text>
              </View>
              <View style={[styles.statusPill, route.status === 'In progress' && styles.activePill]}>
                <Text style={[styles.statusText, route.status === 'In progress' && styles.activeText]}>
                  {route.status}
                </Text>
              </View>
            </View>
            <View style={styles.stops}>
              {route.stops.map((stop, index) => (
                <View key={`${route.code}-${stop}`} style={styles.stopRow}>
                  <View style={styles.stopNumber}>
                    <Text style={styles.stopNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stopName}>{stop}</Text>
                  {index < route.stops.length - 1 && <View style={styles.stopConnector} />}
                </View>
              ))}
            </View>
            <View style={styles.routeMetaRow}>
              <Text style={styles.routeMetaLabel}>VEHICLE</Text>
              <Text style={styles.routeMetaValue}>{route.vehicle}</Text>
              <View style={styles.metaDivider} />
              <Text style={styles.routeMetaLabel}>PROGRESS</Text>
              <Text style={styles.routeMetaValue}>{route.progress}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: route.progress }]} />
            </View>
          </View>
        ))}
      </View>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  routeList: {
    gap: 12,
    marginTop: 14,
  },
  routeCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 18,
    backgroundColor: palette.white,
  },
  routeHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  routeIdentity: {
    flex: 1,
  },
  routeCode: {
    color: palette.forestLight,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  routeName: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 3,
  },
  routeDivision: {
    color: palette.muted,
    fontSize: 11,
    marginTop: 3,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#EEF1EE',
  },
  activePill: {
    backgroundColor: palette.greenSoft,
  },
  statusText: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  activeText: {
    color: palette.green,
  },
  stops: {
    paddingVertical: 15,
  },
  stopRow: {
    minHeight: 33,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  stopNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.mint,
    zIndex: 1,
  },
  stopNumberText: {
    color: palette.forest,
    fontSize: 10,
    fontWeight: '800',
  },
  stopName: {
    color: '#46554C',
    fontSize: 12,
    fontWeight: '600',
  },
  stopConnector: {
    position: 'absolute',
    width: 1,
    height: 12,
    left: 10,
    bottom: -6,
    backgroundColor: '#D4E1D6',
  },
  routeMetaRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: '#EEF1EE',
    paddingTop: 9,
  },
  routeMetaLabel: {
    color: '#89958D',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  routeMetaValue: {
    color: palette.ink,
    fontSize: 10,
    fontWeight: '700',
  },
  metaDivider: {
    width: 1,
    height: 13,
    backgroundColor: palette.border,
    marginHorizontal: 5,
  },
  progressTrack: {
    height: 5,
    overflow: 'hidden',
    marginTop: 6,
    borderRadius: 5,
    backgroundColor: '#EEF1ED',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: palette.forestLight,
  },
});
