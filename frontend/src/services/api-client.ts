import type { ApiProblem, AuthResponse } from "@/types/auth";
import { clearAccessToken, getAccessToken, storeAccessToken } from "./token-storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";
export const SESSION_EXPIRED_EVENT = "ufam-planner:session-expired";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly problem?: ApiProblem,
  ) {
    super(message);
  }
}

let refreshPromise: Promise<AuthResponse> | null = null;

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
  }

  const problem = (await response.json().catch(() => undefined)) as ApiProblem | undefined;
  throw new ApiError(
    problem?.detail ?? (response.status >= 500
      ? "A API está indisponível no momento. Tente novamente em instantes."
      : "Não foi possível concluir a solicitação."),
    response.status,
    problem,
  );
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((response) => parseResponse<AuthResponse>(response))
      .then((session) => {
        storeAccessToken(session.accessToken);
        return session;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function expireSession() {
  clearAccessToken();
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

async function request(path: string, init: RequestInit, token: string | null) {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");

  try {
    return await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      cache: init.cache ?? "no-store",
      headers,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError("Não foi possível conectar à API. Confira se o servidor está ligado e tente novamente.", 0);
    }
    throw error;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response = await request(path, init, getAccessToken());

  if (response.status === 401) {
    try {
      const session = await refreshSession();
      response = await request(path, init, session.accessToken);
    } catch (error) {
      expireSession();
      throw error;
    }
  }

  if (response.status === 401) expireSession();
  return parseResponse<T>(response);
}

export async function publicApiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  return parseResponse<T>(await request(path, init, null));
}
