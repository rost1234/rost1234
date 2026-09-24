import { randomUUID } from 'expo-crypto';

/** Generates a RFC 4122 v4 identifier for local primary keys. */
export function createId(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
