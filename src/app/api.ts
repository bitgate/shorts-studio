import { ReelApiError, type ShortJob, type ShortRequest } from "../lib/reelapi";

// The browser talks to our Worker (/api), which holds the reelapi key
const ACCESS_CODE_KEY = "shorts-studio:access-code";

export function setAccessCode(code: string): void {
  localStorage.setItem(ACCESS_CODE_KEY, code.trim());
}

export function createShort(request: ShortRequest): Promise<ShortJob> {
  return call("/api/shorts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
}

export function getJob(id: string): Promise<ShortJob> {
  return call(`/api/jobs/${encodeURIComponent(id)}`);
}

export function isAccessError(error: ReelApiError): boolean {
  return error.status === 401 && error.code.startsWith("ACCESS_CODE");
}

export function toApiError(error: unknown): ReelApiError {
  if (error instanceof ReelApiError) return error;
  return new ReelApiError(0, "CLIENT_ERROR", error instanceof Error ? error.message : String(error));
}

async function call(path: string, init: RequestInit = {}): Promise<ShortJob> {
  const headers = new Headers(init.headers);
  const code = localStorage.getItem(ACCESS_CODE_KEY);
  if (code) headers.set("x-access-code", code);

  let response: Response;
  try {
    response = await fetch(path, { ...init, headers });
  } catch {
    throw new ReelApiError(0, "NETWORK_ERROR", "Can't reach the server. Check your connection.");
  }

  const body = await response.json().catch(() => null);
  if (response.ok && body?.job) return body.job as ShortJob;

  const error = body?.error ?? {};
  throw new ReelApiError(
    response.status,
    error.code ?? `HTTP_${response.status}`,
    error.message ?? (response.statusText || "Request failed"),
    error.issues ?? [],
  );
}
