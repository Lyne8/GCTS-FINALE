import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { useFirebaseAuth } from '@/features/auth/hooks/use-firebase-auth';
import type {
  ServiceReportStatus,
  ServiceReportType,
} from '@/features/gcts/domain/service-report';

export type AppRole = 'admin' | 'supervisor' | 'collector' | 'resident';
export type ResidentReportType = ServiceReportType;
export type ResidentReportStatus = ServiceReportStatus;

export type ResidentReport = {
  id: string;
  type: ResidentReportType;
  location: string;
  details: string;
  status: ResidentReportStatus;
  submittedLabel: string;
};

type AppRoleContextValue = {
  role: AppRole;
  notificationsVisible: boolean;
  setNotificationsVisible: (visible: boolean) => void;
};

const AppRoleContext = createContext<AppRoleContextValue | null>(null);

export function AppRoleProvider({ children }: PropsWithChildren) {
  const { session } = useFirebaseAuth();
  const [notificationsVisible, setNotificationsVisible] = useState(false);

  // Role is strictly derived from the authenticated identity.
  // Unauthenticated users or residents default to 'resident'.
  const role: AppRole =
    session.status === 'signed-in' ? session.principal.role : 'resident';

  const value = useMemo(
    () => ({
      role,
      notificationsVisible,
      setNotificationsVisible,
    }),
    [role, notificationsVisible]
  );

  return <AppRoleContext.Provider value={value}>{children}</AppRoleContext.Provider>;
}

export function useAppRole() {
  const context = useContext(AppRoleContext);
  if (!context) {
    throw new Error('useAppRole must be used within AppRoleProvider');
  }
  return context;
}

/** Kept for backward compatibility — alias for useAppRole */
export const useDemoRole = useAppRole;

export const appRoles: { value: AppRole; label: string; description: string }[] = [
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

/** @deprecated Use appRoles instead */
export const demoRoles = appRoles;

/** @deprecated Use AppRole instead */
export type DemoRole = AppRole;

/** @deprecated Use AppRoleProvider instead */
export const DemoRoleProvider = AppRoleProvider;
