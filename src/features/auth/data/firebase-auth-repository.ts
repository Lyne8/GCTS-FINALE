import {
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  type Unsubscribe,
  type User,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import {
  InvalidRoleClaimsError,
  resolveAuthPrincipal,
  type AuthFailure,
  type AuthPrincipal,
  type AuthSessionState,
} from '@/features/auth/domain/auth-session';
import {
  connectFirebaseAuthEmulatorIfConfigured,
  FirebaseConfigurationError,
  getFirebaseApp,
} from '@/services/firebase/firebase';
import { getPlatformFirebaseAuth } from '@/services/firebase/auth-platform';

export class AuthOperationError extends Error {
  constructor(readonly failure: AuthFailure) {
    super(failure.message);
    this.name = 'AuthOperationError';
  }
}

function getAuth() {
  const auth = getPlatformFirebaseAuth(getFirebaseApp());
  connectFirebaseAuthEmulatorIfConfigured(auth);
  return auth;
}

export function subscribeToAuthSession(
  onStateChange: (state: AuthSessionState) => void
): Unsubscribe {
  onStateChange({ status: 'loading' });

  let auth;
  try {
    auth = getAuth();
  } catch (error) {
    onStateChange({
      status: 'error',
      failure: mapAuthFailure(error),
    });
    return () => {};
  }

  let active = true;
  const unsubscribe = onIdTokenChanged(
    auth,
    (user) => {
      void publishUserState(user, active, onStateChange);
    },
    (error) => {
      if (active) {
        onStateChange({ status: 'error', failure: mapAuthFailure(error) });
      }
    }
  );

  return () => {
    active = false;
    unsubscribe();
  };
}

export async function registerResident(
  email: string,
  password: string
): Promise<void> {
  try {
    const credential = await createUserWithEmailAndPassword(
      getAuth(),
      email.trim(),
      password
    );
    try {
      await sendEmailVerification(credential.user);
    } catch (error) {
      const failure = mapAuthFailure(error);
      throw new AuthOperationError({
        kind: 'verification-email',
        message: `The account was created, but the verification email could not be sent. ${failure.message} Request another verification email before using reports.`,
      });
    }
  } catch (error) {
    if (error instanceof AuthOperationError) {
      throw error;
    }
    throw new AuthOperationError(mapAuthFailure(error));
  }
}

export async function resendResidentVerificationEmail(): Promise<void> {
  try {
    const user = getAuth().currentUser;
    if (!user) {
      throw new AuthOperationError({
        kind: 'invalid-credentials',
        message: 'Sign in before requesting an email verification link.',
      });
    }
    await sendEmailVerification(user);
  } catch (error) {
    if (error instanceof AuthOperationError) {
      throw error;
    }
    throw new AuthOperationError(mapAuthFailure(error));
  }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<void> {
  try {
    await signInWithEmailAndPassword(getAuth(), email.trim(), password);
  } catch (error) {
    throw new AuthOperationError(mapAuthFailure(error));
  }
}

export async function signOutCurrentUser(): Promise<void> {
  try {
    await signOut(getAuth());
  } catch (error) {
    throw new AuthOperationError(mapAuthFailure(error));
  }
}

export async function refreshCurrentUserSession(): Promise<AuthSessionState> {
  try {
    const user = getAuth().currentUser;
    if (!user) {
      return { status: 'signed-out' };
    }

    await reload(user);
    const token = await user.getIdTokenResult(true);
    return {
      status: 'signed-in',
      principal: resolveAuthPrincipal(
        user.uid,
        user.email,
        user.emailVerified,
        token.claims
      ),
    };
  } catch (error) {
    throw new AuthOperationError(mapAuthFailure(error));
  }
}

async function publishUserState(
  user: User | null,
  active: boolean,
  onStateChange: (state: AuthSessionState) => void
): Promise<void> {
  if (!active) {
    return;
  }
  if (!user) {
    onStateChange({ status: 'signed-out' });
    return;
  }

  try {
    const token = await user.getIdTokenResult();
    const principal: AuthPrincipal = resolveAuthPrincipal(
      user.uid,
      user.email,
      user.emailVerified,
      token.claims
    );
    if (active) {
      onStateChange({ status: 'signed-in', principal });
    }
  } catch (error) {
    if (active) {
      onStateChange({ status: 'error', failure: mapAuthFailure(error) });
    }
  }
}

function mapAuthFailure(error: unknown): AuthFailure {
  if (error instanceof FirebaseConfigurationError) {
    return { kind: 'configuration', message: error.message };
  }
  if (error instanceof InvalidRoleClaimsError) {
    return { kind: 'invalid-role', message: error.message };
  }
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-email':
        return {
          kind: 'invalid-credentials',
          message: 'Enter a valid email address.',
        };
      case 'auth/weak-password':
        return {
          kind: 'invalid-credentials',
          message: 'Choose a stronger password that meets the Firebase project requirements.',
        };
      case 'auth/email-already-in-use':
        return {
          kind: 'invalid-credentials',
          message: 'An account already uses this email. Try signing in instead.',
        };
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return {
          kind: 'invalid-credentials',
          message: 'The email or password is incorrect.',
        };
      case 'auth/network-request-failed':
        return {
          kind: 'network',
          message: 'Authentication is unavailable. Check your connection and try again.',
        };
      case 'auth/too-many-requests':
        return {
          kind: 'unknown',
          message: 'Too many attempts. Wait a while before trying again.',
        };
      case 'auth/operation-not-allowed':
        return {
          kind: 'provider-disabled',
          message: 'Email and password sign-in is not enabled for this Firebase project.',
        };
      default:
        return {
          kind: 'unknown',
          message: 'Authentication failed. Try again or contact the project administrator.',
        };
    }
  }
  return {
    kind: 'unknown',
    message: 'Authentication failed. Try again or contact the project administrator.',
  };
}
