export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function success<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function failure<T>(error: string): Result<T> {
  return { ok: false, error };
}
