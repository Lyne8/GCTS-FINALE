import { useCallback, useEffect, useState } from 'react';

import {
  refreshCurrentUserSession,
  registerResident,
  resendResidentVerificationEmail,
  signInWithEmail,
  signOutCurrentUser,
  subscribeToAuthSession,
} from '@/features/auth/data/firebase-auth-repository';
import type { AuthSessionState } from '@/features/auth/domain/auth-session';

export function useFirebaseAuth() {
  const [session, setSession] = useState<AuthSessionState>({ status: 'loading' });

  useEffect(
    () => subscribeToAuthSession(setSession),
    []
  );

  const register = useCallback(
    (email: string, password: string) => registerResident(email, password),
    []
  );
  const signIn = useCallback(
    (email: string, password: string) => signInWithEmail(email, password),
    []
  );
  const signOut = useCallback(() => signOutCurrentUser(), []);
  const resendVerification = useCallback(
    () => resendResidentVerificationEmail(),
    []
  );
  const refreshSession = useCallback(async () => {
    const updatedSession = await refreshCurrentUserSession();
    setSession(updatedSession);
  }, []);

  return {
    session,
    register,
    signIn,
    signOut,
    resendVerification,
    refreshSession,
  };
}
