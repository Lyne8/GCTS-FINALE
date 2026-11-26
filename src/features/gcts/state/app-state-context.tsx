import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useFirebaseAuth } from '@/features/auth/hooks/use-firebase-auth';
import type { AppRole, AuthSessionState } from '@/features/auth/domain/auth-session';
import type { GctsIconName } from '@/features/gcts/components/gcts-icon';
import { FirebaseBinRepository } from '@/features/gcts/data/firebase-bin-repository';
import { FirebaseRouteRepository } from '@/features/gcts/data/firebase-route-repository';
import { FirebaseServiceReportRepository } from '@/features/gcts/data/firebase-service-report-repository';
import type { WasteBin } from '@/features/gcts/domain/bin';
import type { CollectionRoute } from '@/features/gcts/domain/route';
import type { ServiceReport } from '@/features/gcts/domain/service-report';

export type { AppRole };

export type AppNotification = {
  id: string;
  title: string;
  detail: string;
  time: string;
  icon: GctsIconName;
  priority: 'high' | 'medium';
  read: boolean;
  actionRoute?: '/' | '/bins' | '/routes' | '/resident' | '/reports' | '/settings';
};

const STORAGE_KEY_NOTIFICATIONS_ENABLED = '@gcts_notifications_enabled';
const STORAGE_KEY_PRIORITY_ALERTS_ENABLED = '@gcts_priority_alerts_enabled';
const STORAGE_KEY_READ_IDS = '@gcts_read_notification_ids';

type AppStateContextValue = {
  role: AppRole;
  session: AuthSessionState;
  notificationsVisible: boolean;
  setNotificationsVisible: (visible: boolean) => void;
  settingsVisible: boolean;
  setSettingsVisible: (visible: boolean) => void;
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  priorityAlertsEnabled: boolean;
  setPriorityAlertsEnabled: (enabled: boolean) => void;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

const binRepo = new FirebaseBinRepository();
const routeRepo = new FirebaseRouteRepository();
const reportRepo = new FirebaseServiceReportRepository();

function deriveNotifications(
  notificationsEnabled: boolean,
  priorityAlertsEnabled: boolean,
  bins: WasteBin[],
  routes: CollectionRoute[],
  reports: ServiceReport[],
  role: AppRole,
  session: AuthSessionState,
  readIds: string[]
): AppNotification[] {
  if (!notificationsEnabled) {
    return [];
  }

  const items: AppNotification[] = [];
  const readSet = new Set(readIds);

  if (role === 'admin' || role === 'supervisor') {
    // 1. Critical bin fill breach (>= 85%)
    for (const bin of bins) {
      if (bin.fillLevelPercent !== null && bin.fillLevelPercent >= 85) {
        items.push({
          id: `bin-critical-${bin.id}`,
          title: 'Critical bin level',
          detail: `${bin.name} (${bin.code}) reached ${bin.fillLevelPercent}%. Collection required.`,
          time: bin.lastUpdatedLabel || 'Just now',
          icon: 'priority',
          priority: 'high',
          read: readSet.has(`bin-critical-${bin.id}`),
          actionRoute: '/bins',
        });
      }
    }

    // 2. New citizen service reports (status === 'received')
    for (const report of reports) {
      if (report.status === 'received') {
        const reportType =
          report.type === 'overflowing_bin' ? 'Overflowing bin' : 'Missed collection';
        items.push({
          id: `report-new-${report.id}`,
          title: `New report: ${reportType}`,
          detail: `${report.location}: ${report.details || 'Awaiting supervisor triage.'}`,
          time: 'Pending review',
          icon: 'report',
          priority: 'high',
          read: readSet.has(`report-new-${report.id}`),
          actionRoute: '/reports',
        });
      }
    }

    // 3. Completed route notification (priority: medium)
    if (!priorityAlertsEnabled) {
      for (const route of routes) {
        if (route.status === 'completed') {
          items.push({
            id: `route-completed-${route.id}`,
            title: 'Route completed',
            detail: `${route.name} (${route.code}) has been marked complete.`,
            time: 'Completed',
            icon: 'routes',
            priority: 'medium',
            read: readSet.has(`route-completed-${route.id}`),
            actionRoute: '/routes',
          });
        }
      }
    }
  } else if (role === 'collector') {
    const myUid = session.status === 'signed-in' ? session.principal.uid : null;
    // 1. Assigned or In-Progress routes
    for (const route of routes) {
      if (myUid && route.collectorUid === myUid) {
        if (route.status === 'assigned') {
          items.push({
            id: `route-assigned-${route.id}`,
            title: 'Route assigned to you',
            detail: `${route.name} has ${route.stops.length} scheduled stops.`,
            time: 'Action required',
            icon: 'routes',
            priority: 'high',
            read: readSet.has(`route-assigned-${route.id}`),
            actionRoute: '/routes',
          });
        }

        // Check if any stop on this route is currently >= 85%
        const criticalStops = route.stops.filter((s) => {
          const matchedBin = bins.find((b) => b.id === s.binId);
          return (
            matchedBin &&
            matchedBin.fillLevelPercent !== null &&
            matchedBin.fillLevelPercent >= 85
          );
        });
        if (criticalStops.length > 0) {
          items.push({
            id: `route-priority-stops-${route.id}`,
            title: 'Priority stops pending',
            detail: `${criticalStops.length} stop(s) on ${route.name} exceed 85% capacity.`,
            time: 'Urgent',
            icon: 'priority',
            priority: 'high',
            read: readSet.has(`route-priority-stops-${route.id}`),
            actionRoute: '/routes',
          });
        }
      }
    }
  } else if (role === 'resident') {
    // Citizen report status updates
    for (const report of reports) {
      if (report.status === 'resolved') {
        items.push({
          id: `report-resolved-${report.id}`,
          title: 'Report resolved',
          detail: `Your report for ${report.location} was resolved by the city team.`,
          time: 'Resolved',
          icon: 'available',
          priority: 'high',
          read: readSet.has(`report-resolved-${report.id}`),
          actionRoute: '/resident',
        });
      } else if (report.status === 'under_review' && !priorityAlertsEnabled) {
        items.push({
          id: `report-review-${report.id}`,
          title: 'Report under review',
          detail: `City operations are currently reviewing your report at ${report.location}.`,
          time: 'In review',
          icon: 'info',
          priority: 'medium',
          read: readSet.has(`report-review-${report.id}`),
          actionRoute: '/resident',
        });
      }
    }
  }

  return items;
}

export function AppStateProvider({ children }: PropsWithChildren) {
  const { session } = useFirebaseAuth();
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  // Preference switches (persisted)
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);
  const [priorityAlertsEnabled, setPriorityAlertsEnabledState] = useState(true);
  const [readIds, setReadIds] = useState<string[]>([]);

  // Raw domain state from Firestore
  const [bins, setBins] = useState<WasteBin[]>([]);
  const [routes, setRoutes] = useState<CollectionRoute[]>([]);
  const [reports, setReports] = useState<ServiceReport[]>([]);

  // Load preferences from storage on mount
  useEffect(() => {
    let active = true;
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_NOTIFICATIONS_ENABLED),
      AsyncStorage.getItem(STORAGE_KEY_PRIORITY_ALERTS_ENABLED),
      AsyncStorage.getItem(STORAGE_KEY_READ_IDS),
    ])
      .then(([notifVal, priorityVal, readVal]) => {
        if (!active) return;
        if (notifVal !== null) {
          setNotificationsEnabledState(notifVal === 'true');
        }
        if (priorityVal !== null) {
          setPriorityAlertsEnabledState(priorityVal === 'true');
        }
        if (readVal !== null) {
          try {
            setReadIds(JSON.parse(readVal));
          } catch {
            setReadIds([]);
          }
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const setNotificationsEnabled = useCallback((enabled: boolean) => {
    setNotificationsEnabledState(enabled);
    AsyncStorage.setItem(STORAGE_KEY_NOTIFICATIONS_ENABLED, String(enabled)).catch(() => {});
  }, []);

  const setPriorityAlertsEnabled = useCallback((enabled: boolean) => {
    setPriorityAlertsEnabledState(enabled);
    AsyncStorage.setItem(STORAGE_KEY_PRIORITY_ALERTS_ENABLED, String(enabled)).catch(() => {});
  }, []);

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      AsyncStorage.setItem(STORAGE_KEY_READ_IDS, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  // Role is strictly derived from the authenticated Firebase identity.
  const role: AppRole =
    session.status === 'signed-in' ? session.principal.role : 'resident';

  // Subscribe to live repositories based on session principal
  useEffect(() => {
    if (session.status !== 'signed-in') {
      return;
    }

    const principal = session.principal;

    // Bins subscription (for admin, supervisor, and collector)
    const unsubBins = binRepo.subscribe(principal, (state) => {
      if (state.status === 'ready') {
        setBins(state.bins);
      }
    });

    // Routes subscription
    const unsubRoutes = routeRepo.subscribe(principal, (state) => {
      if (state.status === 'ready') {
        setRoutes(state.routes);
      }
    });

    // Reports subscription (only if permitted)
    let unsubReports = () => {};
    if (principal.role !== 'resident' || principal.emailVerified) {
      unsubReports = reportRepo.subscribe(principal, (state) => {
        if (state.status === 'ready') {
          setReports(state.reports);
        }
      });
    }

    return () => {
      unsubBins();
      unsubRoutes();
      unsubReports();
    };
  }, [session]);

  // Derive "Signal-Only" notifications according to role and preferences
  const notifications = useMemo(() => {
    const activeBins = session.status === 'signed-in' ? bins : [];
    const activeRoutes = session.status === 'signed-in' ? routes : [];
    const activeReports = session.status === 'signed-in' ? reports : [];

    return deriveNotifications(
      notificationsEnabled,
      priorityAlertsEnabled,
      activeBins,
      activeRoutes,
      activeReports,
      role,
      session,
      readIds
    );
  }, [
    notificationsEnabled,
    priorityAlertsEnabled,
    bins,
    routes,
    reports,
    role,
    session,
    readIds,
  ]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => {
      const allIds = new Set(prev);
      notifications.forEach((n) => allIds.add(n.id));
      const next = Array.from(allIds);
      AsyncStorage.setItem(STORAGE_KEY_READ_IDS, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [notifications]);

  const value = useMemo(
    () => ({
      role,
      session,
      notificationsVisible,
      setNotificationsVisible,
      settingsVisible,
      setSettingsVisible,
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      notificationsEnabled,
      setNotificationsEnabled,
      priorityAlertsEnabled,
      setPriorityAlertsEnabled,
    }),
    [
      role,
      session,
      notificationsVisible,
      settingsVisible,
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      notificationsEnabled,
      setNotificationsEnabled,
      priorityAlertsEnabled,
      setPriorityAlertsEnabled,
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}

/** Aliases for smooth migration */
export const useAppRole = useAppState;
export const useDemoRole = useAppState;
export const AppRoleProvider = AppStateProvider;
export const DemoRoleProvider = AppStateProvider;
