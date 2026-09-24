/** Error raised by the data layer; wraps the underlying SQLite failure. */
export class DatabaseError extends Error {
  readonly operation: string;
  readonly cause: unknown;

  constructor(operation: string, cause: unknown) {
    super(`Database operation failed: ${operation}${describe(cause)}`);
    this.name = 'DatabaseError';
    this.operation = operation;
    this.cause = cause;
  }
}

function describe(cause: unknown): string {
  if (cause instanceof Error) return ` (${cause.message})`;
  if (typeof cause === 'string') return ` (${cause})`;
  return '';
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unexpected error';
}

/**
 * Error boundary for SQLite calls: every repository method runs through this
 * so callers always receive a typed `DatabaseError`.
 */
export async function guardDb<T>(operation: string, task: () => Promise<T>): Promise<T> {
  try {
    return await task();
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError(operation, error);
  }
}

/**
 * Runs a fire-and-forget promise without leaving it unhandled.
 */
export function runDetached(promise: Promise<unknown>, onError?: (error: unknown) => void): void {
  promise.catch((error: unknown) => {
    if (onError) {
      onError(error);
    } else if (__DEV__) {
      console.warn('[Momentum] detached task failed:', toErrorMessage(error));
    }
  });
}
