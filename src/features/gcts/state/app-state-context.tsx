import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { useFirebaseAuth } from '@/features/auth/hooks/use-firebase-auth';
import type { AppRole, AuthSessionState } from '@/features/auth/domain/auth-session';

export type { AppRole };

type AppStateContextValue = {
  role: AppRole;
  session: AuthSessionState;
  notificationsVisible: boolean;
  setNotificationsVisible: (visible: boolean) => void;
  settingsVisible: boolean;
  setSettingsVisible: (visible: boolean) => void;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: PropsWithChildren) {
  const { session } = useFirebaseAuth();
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  // Role is strictly derived from the authenticated Firebase identity.
  // Unauthenticated users or residents default to 'resident'.
  const role: AppRole =
    session.status === 'signed-in' ? session.principal.role : 'resident';

  const value = useMemo(
    () => ({
      role,
      session,
      notificationsVisible,
      setNotificationsVisible,
      settingsVisible,
      setSettingsVisible,
    }),
    [role, session, notificationsVisible, settingsVisible]
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
