import "server-only";

const defaultApiUrl = "http://localhost:8080";

export type AdminProfile = {
  id: string;
  name: string;
  email: string;
};

type SuccessBody<T> = {
  data: T;
  message: string;
};

type ErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
};

export function apiBaseUrl() {
  const configured = process.env.API_URL?.trim();
  if (!configured) {
    return defaultApiUrl;
  }
  return configured.replace(/\/$/, "");
}

export async function apiRequest(path: string, init: RequestInit = {}) {
  return fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers: init.headers,
  });
}

export async function readBody<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function errorCode(body: unknown) {
  if (!body || typeof body !== "object" || !("error" in body)) {
    return undefined;
  }
  const detail = (body as ErrorBody).error;
  return detail?.code;
}

export type { ErrorBody, SuccessBody };
