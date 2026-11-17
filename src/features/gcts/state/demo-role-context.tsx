import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { CollectionOutcome } from '@/features/gcts/domain/collection-event';
import {
  calculateRouteProgress,
  type CollectionRoute,
  type RouteStop,
} from '@/features/gcts/domain/route';

export type DemoRole = 'admin' | 'supervisor' | 'collector' | 'resident';
export type ResidentReportType = 'overflowing_bin' | 'missed_collection';
export type ResidentReportStatus = 'received' | 'under_review' | 'resolved';

export type ResidentReport = {
  id: string;
  type: ResidentReportType;
  location: string;
  details: string;
  status: ResidentReportStatus;
  submittedLabel: string;
};

const initialDemoRoutes: CollectionRoute[] = [
  {
    id: 'demo-route-1',
    code: 'GCTS-R01',
    name: 'Central Market Loop',
    divisionId: 'central',
    vehicleId: 'Truck FP-03',
    collectorUid: 'collector-1',
    status: 'in_progress',
    stops: [
      {
        binId: 'central-market',
        name: 'Fort Portal Central Market',
        status: 'collected',
        collectedAt: new Date(Date.now() - 30 * 60000),
        skipReason: null,
      },
      {
        binId: 'mpanga-market',
        name: 'Mpanga Market',
        status: 'collected',
        collectedAt: new Date(Date.now() - 10 * 60000),
        skipReason: null,
      },
      {
        binId: 'kabundaire-market',
        name: 'Kabundaire Market',
        status: 'pending',
        collectedAt: null,
        skipReason: null,
      },
    ],
    progressPercent: 67,
    scheduledAt: new Date(),
    startedAt: new Date(),
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'demo-route-2',
    code: 'GCTS-R02',
    name: 'Kabundaire–Buhinga',
    divisionId: 'north',
    vehicleId: 'Truck FP-01',
    collectorUid: null,
    status: 'assigned',
    stops: [
      {
        binId: 'kabundaire-market',
        name: 'Kabundaire Market',
        status: 'pending',
        collectedAt: null,
        skipReason: null,
      },
      {
        binId: 'buhinga-stadium',
        name: 'Buhinga Stadium',
        status: 'pending',
        collectedAt: null,
        skipReason: null,
      },
      {
        binId: 'nyakaseke-centre',
        name: 'Nyakaseke Trading Centre',
        status: 'pending',
        collectedAt: null,
        skipReason: null,
      },
    ],
    progressPercent: 0,
    scheduledAt: new Date(),
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

type DemoRoleContextValue = {
  role: DemoRole;
  setRole: (role: DemoRole) => void;
  rolePickerVisible: boolean;
  setRolePickerVisible: (visible: boolean) => void;
  notificationsVisible: boolean;
  setNotificationsVisible: (visible: boolean) => void;
  residentReports: ResidentReport[];
  addResidentReport: (report: Omit<ResidentReport, 'id' | 'status' | 'submittedLabel'>) => void;
  updateResidentReportStatus: (id: string, status: ResidentReportStatus) => void;
  demoRoutes: CollectionRoute[];
  assignDemoRouteCollector: (routeId: string, collectorUid: string) => void;
  startDemoRoute: (routeId: string) => void;
  recordDemoStopOutcome: (
    routeId: string,
    stopIndex: number,
    outcome: CollectionOutcome,
    note?: string
  ) => void;
  completeDemoRoute: (routeId: string) => void;
};

const DemoRoleContext = createContext<DemoRoleContextValue | null>(null);

export function DemoRoleProvider({ children }: PropsWithChildren) {
  const [role, setRole] = useState<DemoRole>('supervisor');
  const [rolePickerVisible, setRolePickerVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [residentReports, setResidentReports] = useState<ResidentReport[]>([]);
  const [demoRoutes, setDemoRoutes] = useState<CollectionRoute[]>(initialDemoRoutes);

  const addResidentReport = useCallback(
    (report: Omit<ResidentReport, 'id' | 'status' | 'submittedLabel'>) => {
      setResidentReports((currentReports) => [
        {
          ...report,
          id: `preview-${currentReports.length + 1}`,
          status: 'received',
          submittedLabel: 'Just now',
        },
        ...currentReports,
      ]);
    },
    []
  );

  const updateResidentReportStatus = useCallback(
    (id: string, status: ResidentReportStatus) => {
      setResidentReports((currentReports) =>
        currentReports.map((report) => (report.id === id ? { ...report, status } : report))
      );
    },
    []
  );

  const assignDemoRouteCollector = useCallback((routeId: string, collectorUid: string) => {
    setDemoRoutes((current) =>
      current.map((route) =>
        route.id === routeId
          ? {
              ...route,
              collectorUid,
              status: route.status === 'draft' ? 'assigned' : route.status,
              updatedAt: new Date(),
            }
          : route
      )
    );
  }, []);

  const startDemoRoute = useCallback((routeId: string) => {
    setDemoRoutes((current) =>
      current.map((route) =>
        route.id === routeId
          ? {
              ...route,
              status: 'in_progress',
              startedAt: new Date(),
              updatedAt: new Date(),
            }
          : route
      )
    );
  }, []);

  const recordDemoStopOutcome = useCallback(
    (
      routeId: string,
      stopIndex: number,
      outcome: CollectionOutcome,
      note?: string
    ) => {
      setDemoRoutes((current) =>
        current.map((route) => {
          if (route.id !== routeId) {
            return route;
          }
          const updatedStops: RouteStop[] = route.stops.map((stop, idx) => {
            if (idx !== stopIndex) {
              return stop;
            }
            return {
              ...stop,
              status: outcome,
              collectedAt: new Date(),
              skipReason: outcome === 'skipped' ? (note ?? 'Skipped by collector') : null,
            };
          });
          return {
            ...route,
            stops: updatedStops,
            progressPercent: calculateRouteProgress(updatedStops),
            updatedAt: new Date(),
          };
        })
      );
    },
    []
  );

  const completeDemoRoute = useCallback((routeId: string) => {
    setDemoRoutes((current) =>
      current.map((route) =>
        route.id === routeId
          ? {
              ...route,
              status: 'completed',
              completedAt: new Date(),
              updatedAt: new Date(),
            }
          : route
      )
    );
  }, []);

  const value = useMemo(
    () => ({
      role,
      setRole,
      rolePickerVisible,
      setRolePickerVisible,
      notificationsVisible,
      setNotificationsVisible,
      residentReports,
      addResidentReport,
      updateResidentReportStatus,
      demoRoutes,
      assignDemoRouteCollector,
      startDemoRoute,
      recordDemoStopOutcome,
      completeDemoRoute,
    }),
    [
      role,
      rolePickerVisible,
      notificationsVisible,
      residentReports,
      addResidentReport,
      updateResidentReportStatus,
      demoRoutes,
      assignDemoRouteCollector,
      startDemoRoute,
      recordDemoStopOutcome,
      completeDemoRoute,
    ]
  );

  return <DemoRoleContext.Provider value={value}>{children}</DemoRoleContext.Provider>;
}

export function useDemoRole() {
  const context = useContext(DemoRoleContext);
  if (!context) {
    throw new Error('useDemoRole must be used within DemoRoleProvider');
  }
  return context;
}

export const demoRoles: { value: DemoRole; label: string; description: string }[] = [
  {
    value: 'admin',
    label: 'City administrator',
    description: 'City-wide overview and system management',
  },
  {
    value: 'supervisor',
    label: 'Supervisor',
    description: 'Bin priorities and collection coordination',
  },
  {
    value: 'collector',
    label: 'Collector / driver',
    description: 'Assigned route and collection work',
  },
  {
    value: 'resident',
    label: 'Resident',
    description: 'Public service information and issue reporting',
  },
];
