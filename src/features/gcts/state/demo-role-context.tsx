import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

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
};

const DemoRoleContext = createContext<DemoRoleContextValue | null>(null);

export function DemoRoleProvider({ children }: PropsWithChildren) {
  const [role, setRole] = useState<DemoRole>('supervisor');
  const [rolePickerVisible, setRolePickerVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [residentReports, setResidentReports] = useState<ResidentReport[]>([]);
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
    }),
    [
      role,
      rolePickerVisible,
      notificationsVisible,
      residentReports,
      addResidentReport,
      updateResidentReportStatus,
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
