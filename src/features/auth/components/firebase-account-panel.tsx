import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AuthOperationError } from '@/features/auth/data/firebase-auth-repository';
import type { AppRole } from '@/features/auth/domain/auth-session';
import { useFirebaseAuth } from '@/features/auth/hooks/use-firebase-auth';
import { palette } from '@/features/gcts/palette';

type FormMode = 'sign-in' | 'register';

const roleLabels: Record<AppRole, string> = {
  admin: 'City administrator',
  supervisor: 'Supervisor',
  collector: 'Collector / driver',
  resident: 'Resident',
};

export function FirebaseAccountPanel() {
  const {
    session,
    register,
    signIn,
    signOut,
    resendVerification,
    refreshSession,
  } = useFirebaseAuth();
  const [mode, setMode] = useState<FormMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function runAction(action: () => Promise<void>, successMessage?: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      if (successMessage) {
        setMessage(successMessage);
      }
    } catch (error) {
      setMessage(
        error instanceof AuthOperationError
          ? error.failure.message
          : 'Authentication failed. Try again or contact the project administrator.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitCredentials() {
    if (!email.trim() || !password) {
      setMessage('Enter your email and password to continue.');
      return;
    }
    await runAction(
      () => mode === 'register'
        ? register(email, password)
        : signIn(email, password),
      mode === 'register' ? 'Account created. Check your email to verify it.' : undefined
    );
    setPassword('');
  }

  return (
    <View style={styles.card}>
      {session.status === 'loading' && (
        <View style={styles.statusRow}>
          <ActivityIndicator color={palette.forest} />
          <Text style={styles.body}>Checking account...</Text>
        </View>
      )}

      {session.status === 'error' && (
        <Text accessibilityRole="alert" style={styles.error}>
          {session.failure.message}
        </Text>
      )}

      {session.status === 'signed-in' ? (
        <View style={styles.accountContent}>
          <Text style={styles.email}>{session.principal.email ?? 'Signed-in account'}</Text>
          <Text style={styles.role}>{roleLabels[session.principal.role]}</Text>
          {session.principal.role === 'supervisor' && (
            <Text style={styles.scope}>
              Division access: {session.principal.divisionIds.join(', ')}
            </Text>
          )}

          {!session.principal.emailVerified && (
            <View style={styles.verificationNotice}>
              <Text style={styles.noticeText}>
                Verify your email before submitting resident reports.
              </Text>
              <View style={styles.actionRow}>
                <ActionButton
                  title="Resend email"
                  disabled={busy}
                  onPress={() => runAction(
                    resendVerification,
                    'Verification email sent. Check your inbox.'
                  )}
                  secondary
                />
                <ActionButton
                  title="I verified"
                  disabled={busy}
                  onPress={() => runAction(refreshSession)}
                  secondary
                />
              </View>
            </View>
          )}

          <ActionButton
            title="Sign out"
            disabled={busy}
            onPress={() => runAction(signOut)}
          />
        </View>
      ) : session.status === 'signed-out' || session.status === 'error' ? (
        <View style={styles.accountContent}>
          <Text style={styles.body}>
            {mode === 'register'
              ? 'Create a resident account with email and password.'
              : 'Sign in to your GCTS account.'}
          </Text>
          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email address"
            placeholderTextColor={palette.muted}
            style={styles.input}
            value={email}
          />
          <TextInput
            accessibilityLabel="Password"
            autoCapitalize="none"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={palette.muted}
            secureTextEntry
            style={styles.input}
            value={password}
          />
          <ActionButton
            title={mode === 'register' ? 'Create resident account' : 'Sign in'}
            disabled={busy}
            onPress={submitCredentials}
          />
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              setMessage(null);
              setMode(mode === 'register' ? 'sign-in' : 'register');
            }}
            style={styles.modeButton}>
            <Text style={styles.modeButtonText}>
              {mode === 'register'
                ? 'Already registered? Sign in'
                : 'New resident? Create an account'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {busy && (
        <View accessibilityLiveRegion="polite" style={styles.busyRow}>
          <ActivityIndicator color={palette.forest} size="small" />
          <Text style={styles.body}>Working...</Text>
        </View>
      )}
      {message && (
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {message}
        </Text>
      )}
    </View>
  );
}

function ActionButton({
  title,
  onPress,
  disabled,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondaryButton,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}>
      <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 17,
    backgroundColor: palette.white,
  },
  accountContent: {
    gap: 12,
  },
  statusRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  body: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  email: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  role: {
    color: palette.forest,
    fontSize: 12,
    fontWeight: '700',
  },
  scope: {
    color: palette.muted,
    fontSize: 11,
  },
  input: {
    minHeight: 46,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    color: palette.ink,
    fontSize: 14,
    backgroundColor: palette.white,
  },
  button: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: palette.forest,
  },
  buttonText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: '800',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: palette.forestLight,
    backgroundColor: palette.white,
  },
  secondaryButtonText: {
    color: palette.forest,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonPressed: {
    opacity: 0.78,
  },
  modeButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonText: {
    color: palette.forest,
    fontSize: 12,
    fontWeight: '700',
  },
  verificationNotice: {
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: palette.amberSoft,
  },
  noticeText: {
    color: palette.amber,
    fontSize: 12,
    lineHeight: 17,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  message: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  error: {
    color: palette.red,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
});
