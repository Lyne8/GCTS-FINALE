import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import { connectAuthEmulator } from 'firebase/auth';

export class FirebaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FirebaseConfigurationError';
  }
}

let firebaseApp: FirebaseApp | undefined;
let firestore: Firestore | undefined;
let authEmulatorConnected = false;

export function getFirebaseApp(): FirebaseApp {
  if (firebaseApp) {
    return firebaseApp;
  }

  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;

  const missingValues = [
    !apiKey && 'EXPO_PUBLIC_FIREBASE_API_KEY',
    !projectId && 'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    !appId && 'EXPO_PUBLIC_FIREBASE_APP_ID',
  ].filter(Boolean);

  if (missingValues.length > 0) {
    throw new FirebaseConfigurationError(
      `Missing Firebase client configuration: ${missingValues.join(', ')}.`
    );
  }

  const options = {
    apiKey,
    projectId,
    appId,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || undefined,
    storageBucket:
      process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
    messagingSenderId:
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || undefined,
  };
  const existingApp = getApps().find((app) => app.name === 'gcts');
  if (
    existingApp
    && (
      existingApp.options.projectId !== projectId
      || existingApp.options.appId !== appId
    )
  ) {
    throw new FirebaseConfigurationError(
      'The existing GCTS Firebase app does not match the current project configuration. Restart the app after changing Firebase configuration.'
    );
  }

  firebaseApp =
    existingApp ??
    initializeApp(options, 'gcts');

  return firebaseApp;
}

export function getFirebaseFirestore(): Firestore {
  if (firestore) {
    return firestore;
  }

  const emulatorHost = getFirebaseEmulatorHost();
  const database = getFirestore(getFirebaseApp());
  if (emulatorHost) {
    connectFirestoreEmulator(database, emulatorHost, 8080);
  }

  firestore = database;
  return firestore;
}

export function connectFirebaseAuthEmulatorIfConfigured(
  auth: Parameters<typeof connectAuthEmulator>[0]
): void {
  const emulatorHost = getFirebaseEmulatorHost();
  if (emulatorHost && !authEmulatorConnected) {
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, {
      disableWarnings: true,
    });
    authEmulatorConnected = true;
  }
}

function isFirebaseEmulatorConfigured(): boolean {
  return process.env.EXPO_PUBLIC_FIREBASE_USE_EMULATORS === 'true';
}

function getFirebaseEmulatorHost(): string | null {
  if (!isFirebaseEmulatorConfigured()) {
    return null;
  }

  if (process.env.NODE_ENV !== 'development') {
    throw new FirebaseConfigurationError(
      'Firebase emulators can only be enabled in a development build.'
    );
  }

  const host = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST?.trim();
  if (!host) {
    throw new FirebaseConfigurationError(
      'EXPO_PUBLIC_FIREBASE_EMULATOR_HOST is required when emulators are enabled.'
    );
  }

  return host;
}
