import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseError, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';

let auth: Auth | undefined;

export function getPlatformFirebaseAuth(app: FirebaseApp): Auth {
  if (auth) {
    return auth;
  }

  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    if (
      error instanceof FirebaseError
      && error.code === 'auth/already-initialized'
    ) {
      auth = getAuth(app);
    } else {
      throw error;
    }
  }

  return auth;
}
