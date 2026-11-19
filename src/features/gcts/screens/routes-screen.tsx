import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { useFirebaseAuth } from '@/features/auth/hooks/use-firebase-auth';
import { AppPage } from '@/features/gcts/components/app-page';
import { GctsIcon } from '@/features/gcts/components/gcts-icon';
import { FirebaseRouteRepository } from '@/features/gcts/data/firebase-route-repository';
import { FirebaseStaffProfileRepository } from '@/features/gcts/data/firebase-staff-profile-repository';
import {
  RouteRepositoryError,
  type RouteListState,
} from '@/features/gcts/data/route-repository';
import type {
  StaffProfileState,
} from '@/features/gcts/data/staff-profile-repository';
import type { CollectionRoute, RouteStatus } from '@/features/gcts/domain/route';
import { palette } from '@/features/gcts/palette';
import { useDemoRole } from '@/features/gcts/state/demo-role-context';

const filters = ['All routes', 'In progress', 'Assigned', 'Completed'] as const;
type RouteFilter = (typeof filters)[number];

const statusLabels: Record<RouteStatus, string> = {
  draft: 'Draft',
  assigned: 'Assigned',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const divisionNames: Record<string, string> = {
  central: 'Central Division',
  north: 'North Division',
};

const firebaseRouteRepository = new FirebaseRouteRepository();
const firebaseStaffProfileRepository = new FirebaseStaffProfileRepository();

export function RoutesScreen() {
  const { role: previewRole } = useDemoRole();
  const { session } = useFirebaseAuth();

  const [filter, setFilter] = useState<RouteFilter>('All routes');
  const [routesState, setRoutesState] = useState<RouteListState>({ status: 'loading' });
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [assigningRoute, setAssigningRoute] = useState<CollectionRoute | null>(null);
  const [selectedCollectorUid, setSelectedCollectorUid] = useState('');
  const [staffState, setStaffState] = useState<StaffProfileState>({ status: 'loading' });

  const principal = session.status === 'signed-in' ? session.principal : null;
  const liveMode =
    principal?.role === 'admin' ||
    principal?.role === 'supervisor' ||
    principal?.role === 'collector';
  const role = principal?.role ?? previewRole;

  useEffect(() => {
    if (!liveMode || !principal) {
      return;
    }
    return firebaseRouteRepository.subscribe(principal, setRoutesState);
  }, [liveMode, principal]);

  useEffect(() => {
    if (!liveMode || !principal) {
      return;
    }
    return firebaseStaffProfileRepository.subscribeStaff(setStaffState);
  }, [liveMode, principal]);

  const availableCollectors = useMemo(() => {
    if (liveMode) {
      return staffState.status === 'ready' ? staffState.collectors : [];
    }
    return [];
  }, [liveMode, staffState]);

  const getCollectorDisplayName = (uid: string | null): string => {
    if (!uid) return 'Unassigned';
    if (liveMode && staffState.status === 'ready' && staffState.profiles[uid]) {
      return staffState.profiles[uid].displayName;
    }
    return 'Assigned Collector';
  };

  const sourceRoutes = useMemo(() => {
    if (!liveMode || routesState.status !== 'ready') {
      return [];
    }
    return routesState.routes;
  }, [liveMode, routesState]);

  const filteredRoutes = useMemo(() => {
    return sourceRoutes.filter((route) => {
      if (filter === 'All routes') return true;
      if (filter === 'In progress') return route.status === 'in_progress';
      if (filter === 'Assigned') return route.status === 'assigned';
      if (filter === 'Completed') return route.status === 'completed';
      return true;
    });
  }, [filter, sourceRoutes]);

  const inProgressCount = sourceRoutes.filter((r) => r.status === 'in_progress').length;
  const completedCount = sourceRoutes.filter((r) => r.status === 'completed').length;

  if (session.status === 'loading') {
    return (
      <AppPage eyebrow="COLLECTION WORK" title="Routes" subtitle="Checking account status.">
        <DataMessage message="Checking account..." />
      </AppPage>
    );
  }

  if (session.status === 'error') {
    return (
      <AppPage eyebrow="COLLECTION WORK" title="Routes" subtitle="Account status is temporarily unavailable.">
        <DataMessage message={session.failure.message} />
      </AppPage>
    );
  }

  if (!principal) {
    return (
      <AppPage
        eyebrow="COLLECTION WORK"
        title="Operational routes"
        subtitle="Route assignments and collection workflows.">
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <GctsIcon name="routes" size={24} color={palette.forestLight} />
          </View>
          <Text style={styles.emptyTitle}>Staff Sign In Required</Text>
          <Text style={styles.emptyCopy}>
            Daily collection routes and stop assignments are restricted to authorized collectors, supervisors, and city administrators. Sign in with your staff account to continue.
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

  if (role === 'resident') {
    return (
      <AppPage
        eyebrow="COLLECTION WORK"
        title="Operational routes"
        subtitle="Route assignments are restricted to collection teams and supervisors.">
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <GctsIcon name="routes" size={22} color={palette.forestLight} />
          </View>
          <Text style={styles.emptyTitle}>Operational Route Access</Text>
          <Text style={styles.emptyCopy}>
            Daily collection routes and stop assignments are coordinated directly by municipal
            supervisors and drivers.
          </Text>
        </View>
      </AppPage>
    );
  }

  async function handleStartRoute(routeId: string) {
    if (!liveMode || !principal) return;
    setBusyAction(`start-${routeId}`);
    setActionMessage(null);
    try {
      await firebaseRouteRepository.startRoute(principal, routeId);
    } catch (error) {
      setActionMessage(
        error instanceof RouteRepositoryError
          ? error.failure.message
          : 'Could not start the route. Try again.'
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRecordStop(
    routeId: string,
    stopIndex: number,
    outcome: 'collected' | 'skipped'
  ) {
    if (!liveMode || !principal) return;
    setBusyAction(`stop-${routeId}-${stopIndex}`);
    setActionMessage(null);
    try {
      await firebaseRouteRepository.recordStopOutcome(principal, routeId, stopIndex, outcome, {
        note: outcome === 'skipped' ? 'Skipped by collector' : null,
      });
    } catch (error) {
      setActionMessage(
        error instanceof RouteRepositoryError
          ? error.failure.message
          : 'Could not record collection outcome. Try again.'
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCompleteRoute(routeId: string) {
    if (!liveMode || !principal) return;
    setBusyAction(`complete-${routeId}`);
    setActionMessage(null);
    try {
      await firebaseRouteRepository.completeRoute(principal, routeId);
    } catch (error) {
      setActionMessage(
        error instanceof RouteRepositoryError
          ? error.failure.message
          : 'Could not complete the route. Try again.'
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleAssignCollector() {
    if (!assigningRoute || !liveMode || !principal) return;
    const targetUid = selectedCollectorUid.trim();
    if (targetUid.length === 0) return;

    setBusyAction(`assign-${assigningRoute.id}`);
    setActionMessage(null);
    try {
      await firebaseRouteRepository.assignCollector(principal, assigningRoute.id, targetUid);
      setAssigningRoute(null);
      setSelectedCollectorUid('');
    } catch (error) {
      setActionMessage(
        error instanceof RouteRepositoryError
          ? error.failure.message
          : 'Could not assign collector. Try again.'
      );
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <AppPage
      eyebrow="COLLECTION WORK"
      title="Routes"
      subtitle="Planned and active collection runs across the pilot divisions.">
      {actionMessage && <DataMessage message={actionMessage} />}

      {liveMode && routesState.status === 'loading' && (
        <DataMessage message="Loading routes..." />
      )}
      {liveMode && routesState.status === 'permission-denied' && (
        <DataMessage message={routesState.message} />
      )}
      {liveMode && routesState.status === 'offline' && (
        <DataMessage message={routesState.message} />
      )}
      {liveMode && routesState.status === 'error' && (
        <DataMessage message={routesState.failure.message} />
      )}
      {liveMode && routesState.status === 'ready' && routesState.source === 'cache' && (
        <DataMessage message="Offline mode: showing saved routes." />
      )}

      <View style={styles.summaryRow}>
        <SummaryCard value={String(sourceRoutes.length)} label="Total routes" icon="routes" />
        <SummaryCard value={String(inProgressCount)} label="In progress" icon="priority" />
        <SummaryCard value={String(completedCount)} label="Completed" icon="available" />
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
              <Text style={[styles.filterLabel, selected && styles.filterLabelSelected]}>
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.routeList}>
        {(!liveMode && filteredRoutes.length === 0)
        || (liveMode &&
          (routesState.status === 'empty' ||
            (routesState.status === 'ready' && filteredRoutes.length === 0))) ? (
          <EmptyRoutes filter={filter} />
        ) : null}

        {filteredRoutes.length > 0 && (!liveMode || routesState.status === 'ready')
          ? filteredRoutes.map((route) => {
              const isSupervisorOrAdmin = role === 'admin' || role === 'supervisor';
              const isCollector = role === 'collector';
              const isBusy = busyAction?.startsWith(route.id) ?? false;
              const allStopsHandled =
                route.stops.length > 0 &&
                route.stops.every((s) => s.status === 'collected' || s.status === 'skipped');

              return (
                <View key={route.id} style={styles.routeCard}>
                  <View style={styles.routeHeading}>
                    <View style={styles.routeIdentity}>
                      <Text style={styles.routeCode}>{route.code}</Text>
                      <Text style={styles.routeName}>{route.name}</Text>
                      <Text style={styles.routeDivision}>
                        {divisionNames[route.divisionId] ?? route.divisionId}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        route.status === 'in_progress' && styles.activePill,
                        route.status === 'completed' && styles.completedPill,
                      ]}>
                      <Text
                        style={[
                          styles.statusText,
                          route.status === 'in_progress' && styles.activeText,
                          route.status === 'completed' && styles.completedText,
                        ]}>
                        {statusLabels[route.status]}
                      </Text>
                    </View>
                  </View>

                  {/* Route Stops */}
                  <View style={styles.stops}>
                    {route.stops.map((stop, index) => {
                      const isStopBusy = busyAction === `stop-${route.id}-${index}`;
                      return (
                        <View key={`${route.id}-${stop.binId}-${index}`} style={styles.stopContainer}>
                          <View style={styles.stopRow}>
                            <View
                              style={[
                                styles.stopNumber,
                                stop.status === 'collected' && styles.stopNumberCollected,
                                stop.status === 'skipped' && styles.stopNumberSkipped,
                              ]}>
                              <Text
                                style={[
                                  styles.stopNumberText,
                                  stop.status === 'collected' && styles.stopNumberTextCollected,
                                  stop.status === 'skipped' && styles.stopNumberTextSkipped,
                                ]}>
                                {index + 1}
                              </Text>
                            </View>
                            <View style={styles.stopInfo}>
                              <Text style={styles.stopName}>{stop.name}</Text>
                              {stop.status !== 'pending' && (
                                <Text style={styles.stopMeta}>
                                  {stop.status === 'collected'
                                    ? 'Collected'
                                    : `Skipped${stop.skipReason ? `: ${stop.skipReason}` : ''}`}
                                </Text>
                              )}
                            </View>

                            {/* Stop action controls for collector when route is in_progress */}
                            {isCollector && route.status === 'in_progress' && stop.status === 'pending' && (
                              <View style={styles.stopActionGroup}>
                                <Pressable
                                  accessibilityRole="button"
                                  disabled={isStopBusy}
                                  onPress={() => void handleRecordStop(route.id, index, 'collected')}
                                  style={({ pressed }) => [
                                    styles.collectButton,
                                    pressed && styles.pressed,
                                    isStopBusy && styles.actionButtonDisabled,
                                  ]}>
                                  <Text style={styles.collectButtonText}>
                                    {isStopBusy ? '...' : 'Collect'}
                                  </Text>
                                </Pressable>
                                <Pressable
                                  accessibilityRole="button"
                                  disabled={isStopBusy}
                                  onPress={() => void handleRecordStop(route.id, index, 'skipped')}
                                  style={({ pressed }) => [
                                    styles.skipButton,
                                    pressed && styles.pressed,
                                    isStopBusy && styles.actionButtonDisabled,
                                  ]}>
                                  <Text style={styles.skipButtonText}>Skip</Text>
                                </Pressable>
                              </View>
                            )}
                          </View>
                          {index < route.stops.length - 1 && <View style={styles.stopConnector} />}
                        </View>
                      );
                    })}
                  </View>

                  {/* Route Meta */}
                  <View style={styles.routeMetaRow}>
                    <Text style={styles.routeMetaLabel}>VEHICLE</Text>
                    <Text style={styles.routeMetaValue}>{route.vehicleId}</Text>
                    <View style={styles.metaDivider} />
                    <Text style={styles.routeMetaLabel}>COLLECTOR</Text>
                    <Text style={styles.routeMetaValue}>
                      {getCollectorDisplayName(route.collectorUid)}
                    </Text>
                    <View style={styles.metaDivider} />
                    <Text style={styles.routeMetaLabel}>PROGRESS</Text>
                    <Text style={styles.routeMetaValue}>{route.progressPercent}%</Text>
                  </View>

                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${route.progressPercent}%` },
                        route.status === 'completed' && styles.progressFillCompleted,
                      ]}
                    />
                  </View>

                  {/* Actions for Route */}
                  <View style={styles.routeFooter}>
                    {/* Supervisor assign button */}
                    {isSupervisorOrAdmin && (
                      <Pressable
                        accessibilityRole="button"
                        disabled={isBusy}
                        onPress={() => {
                          setAssigningRoute(route);
                          setSelectedCollectorUid(route.collectorUid ?? '');
                        }}
                        style={({ pressed }) => [
                          styles.secondaryButton,
                          pressed && styles.pressed,
                        ]}>
                        <Text style={styles.secondaryButtonText}>
                          {route.collectorUid ? 'Reassign driver' : 'Assign driver'}
                        </Text>
                      </Pressable>
                    )}

                    {/* Start route button */}
                    {route.status === 'assigned' && (isCollector || isSupervisorOrAdmin) && (
                      <Pressable
                        accessibilityRole="button"
                        disabled={isBusy}
                        onPress={() => void handleStartRoute(route.id)}
                        style={({ pressed }) => [
                          styles.primaryButton,
                          pressed && styles.pressed,
                          isBusy && styles.actionButtonDisabled,
                        ]}>
                        <Text style={styles.primaryButtonText}>
                          {busyAction === `start-${route.id}` ? 'Starting...' : 'Start route'}
                        </Text>
                        <GctsIcon name="chevron" size={14} color={palette.white} />
                      </Pressable>
                    )}

                    {/* Complete route button */}
                    {route.status === 'in_progress' && (isCollector || isSupervisorOrAdmin) && (
                      <Pressable
                        accessibilityRole="button"
                        disabled={isBusy}
                        onPress={() => void handleCompleteRoute(route.id)}
                        style={({ pressed }) => [
                          styles.completeButton,
                          allStopsHandled && styles.completeButtonReady,
                          pressed && styles.pressed,
                          isBusy && styles.actionButtonDisabled,
                        ]}>
                        <Text style={styles.completeButtonText}>
                          {busyAction === `complete-${route.id}`
                            ? 'Completing...'
                            : allStopsHandled
                              ? 'Finish route'
                              : 'End route early'}
                        </Text>
                        <GctsIcon name="available" size={14} color={palette.white} />
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })
          : null}
      </View>

      {/* Assignment Modal */}
      <Modal
        visible={assigningRoute !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAssigningRoute(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalDialog}>
            <Text style={styles.modalTitle}>Assign Route Collector</Text>
            <Text style={styles.modalSubtitle}>
              Route: {assigningRoute?.code} ({assigningRoute?.name})
            </Text>

            <Text style={styles.modalSectionLabel}>Select Collector</Text>
            {availableCollectors.length === 0 ? (
              <Text style={styles.emptyCollectorListText}>
                No collector profiles found. Add collectors in staff management.
              </Text>
            ) : (
              <View style={styles.collectorList}>
                {availableCollectors.map((collector) => {
                  const isSelected = selectedCollectorUid === collector.uid;
                  return (
                    <Pressable
                      key={collector.uid}
                      accessibilityRole="button"
                      onPress={() => setSelectedCollectorUid(collector.uid)}
                      style={[
                        styles.collectorOption,
                        isSelected && styles.collectorOptionSelected,
                      ]}>
                      <View style={styles.collectorOptionText}>
                        <Text
                          style={[
                            styles.collectorName,
                            isSelected && styles.collectorNameSelected,
                          ]}>
                          {collector.displayName}
                        </Text>
                        <Text style={styles.collectorEmail}>{collector.email}</Text>
                      </View>
                      {isSelected ? (
                        <View style={styles.selectedBadge}>
                          <Text style={styles.selectedBadgeText}>Selected</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View style={styles.modalButtonRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setAssigningRoute(null)}
                style={styles.modalCancelButton}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={selectedCollectorUid.trim().length === 0}
                onPress={() => void handleAssignCollector()}
                style={[
                  styles.modalConfirmButton,
                  selectedCollectorUid.trim().length === 0 && styles.actionButtonDisabled,
                ]}>
                <Text style={styles.modalConfirmButtonText}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </AppPage>
  );
}

function EmptyRoutes({ filter }: { filter: RouteFilter }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <GctsIcon name="available" size={22} color={palette.green} />
      </View>
      <Text style={styles.emptyTitle}>
        {filter === 'All routes' ? 'No routes found' : `No ${filter.toLowerCase()} routes`}
      </Text>
      <Text style={styles.emptyCopy}>Planned and assigned routes will appear here.</Text>
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

function SummaryCard({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: 'routes' | 'priority' | 'available';
}) {
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

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
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
    marginTop: 20,
    marginBottom: 12,
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
  routeList: {
    gap: 14,
    marginTop: 8,
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
  completedPill: {
    backgroundColor: palette.mint,
  },
  statusText: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  activeText: {
    color: palette.green,
  },
  completedText: {
    color: palette.forest,
  },
  stops: {
    paddingVertical: 14,
  },
  stopContainer: {
    position: 'relative',
  },
  stopRow: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
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
  stopNumberCollected: {
    backgroundColor: palette.green,
  },
  stopNumberSkipped: {
    backgroundColor: '#E0E0E0',
  },
  stopNumberText: {
    color: palette.forest,
    fontSize: 10,
    fontWeight: '800',
  },
  stopNumberTextCollected: {
    color: palette.white,
  },
  stopNumberTextSkipped: {
    color: '#777',
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    color: '#46554C',
    fontSize: 12,
    fontWeight: '600',
  },
  stopMeta: {
    color: palette.muted,
    fontSize: 10,
    marginTop: 2,
  },
  stopActionGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  collectButton: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: palette.forest,
  },
  collectButtonText: {
    color: palette.white,
    fontSize: 10,
    fontWeight: '700',
  },
  skipButton: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
  },
  skipButtonText: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  stopConnector: {
    position: 'absolute',
    width: 1,
    height: 18,
    left: 10,
    bottom: -10,
    backgroundColor: '#D4E1D6',
    zIndex: 0,
  },
  routeMetaRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: '#EEF1EE',
    paddingTop: 10,
    flexWrap: 'wrap',
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
    marginHorizontal: 4,
  },
  progressTrack: {
    height: 6,
    overflow: 'hidden',
    marginTop: 8,
    borderRadius: 5,
    backgroundColor: '#EEF1ED',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: palette.forestLight,
  },
  progressFillCompleted: {
    backgroundColor: palette.green,
  },
  routeFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  primaryButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: palette.forest,
  },
  primaryButtonText: {
    color: palette.white,
    fontSize: 11,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
  },
  secondaryButtonText: {
    color: palette.forest,
    fontSize: 11,
    fontWeight: '700',
  },
  completeButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#6A7D71',
  },
  completeButtonReady: {
    backgroundColor: palette.green,
  },
  completeButtonText: {
    color: palette.white,
    fontSize: 11,
    fontWeight: '800',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalDialog: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    backgroundColor: palette.white,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.ink,
  },
  modalSubtitle: {
    fontSize: 12,
    color: palette.muted,
    marginTop: 4,
    marginBottom: 16,
  },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.ink,
    marginBottom: 8,
  },
  emptyCollectorListText: {
    fontSize: 12,
    color: palette.muted,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  collectorList: {
    gap: 8,
    marginBottom: 14,
  },
  collectorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.canvas,
  },
  collectorOptionSelected: {
    borderColor: palette.forest,
    backgroundColor: palette.mint,
  },
  collectorOptionText: {
    flex: 1,
  },
  collectorName: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.ink,
  },
  collectorNameSelected: {
    color: palette.forest,
  },
  collectorEmail: {
    fontSize: 11,
    color: palette.muted,
    marginTop: 2,
  },
  selectedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: palette.forest,
  },
  selectedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: palette.white,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  modalCancelButtonText: {
    color: palette.muted,
    fontWeight: '700',
    fontSize: 12,
  },
  modalConfirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: palette.forest,
  },
  modalConfirmButtonText: {
    color: palette.white,
    fontWeight: '800',
    fontSize: 12,
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
  pressed: {
    opacity: 0.78,
  },
});
