// Installs a synchronous, SQLite-backed `localStorage` global on Android/iOS.
import 'expo-sqlite/localStorage/install';

/** Key-value storage for sessions and preferences (see storage.web.ts for web). */
export const storage: Storage = globalThis.localStorage;
