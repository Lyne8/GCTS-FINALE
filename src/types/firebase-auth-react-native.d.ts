import type { Persistence } from 'firebase/auth';

type FirebaseAuthAsyncStorage = {
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  setItem(key: string, value: string): Promise<void>;
};

declare module 'firebase/auth' {
  // The React Native runtime exports this helper, but the Firebase umbrella
  // package's shared type entry does not include its platform-specific export.
  export function getReactNativePersistence(
    storage: FirebaseAuthAsyncStorage
  ): Persistence;
}
