/** The browser's own localStorage (expo-sqlite's shim is native-only). */
export const storage: Storage = globalThis.localStorage;
