export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly requestId?: string;

  constructor(message: string, status: number, code?: string, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

/** Empty string = same origin (Vite proxy in dev, Express in prod). */
export const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

export async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let code: string | undefined;
    let message = res.statusText;
    let requestId: string | undefined;
    try {
      const body = (await res.json()) as {
        error?: { code?: string; message?: string; requestId?: string };
      };
      code = body.error?.code;
      message = body.error?.message ?? message;
      requestId = body.error?.requestId;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(message, res.status, code, requestId);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
