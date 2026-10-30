import type { ApiProblem, AuthResponse, AuthUser, RegisterPayload } from "@/types/auth";
import { ApiError, apiFetch, publicApiFetch } from "@/services/api-client";

export { ApiError as AuthApiError };

async function post<T>(path: string, body?: unknown): Promise<T> {
  return publicApiFetch<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export const authApi = {
  login(identifier: string, password: string) {
    return post<AuthResponse>("/auth/login", { identifier, password });
  },

  register(payload: RegisterPayload) {
    return post<void>("/auth/register", payload);
  },

  verifyEmail(email: string, code: string) {
    return post<void>("/auth/email/verify", { email, code });
  },

  resendVerification(email: string) {
    return post<void>("/auth/email/resend", { email });
  },

  google(credential: string) {
    return post<AuthResponse>("/auth/google", { credential });
  },

  forgotPassword(email: string) {
    return post<void>("/auth/password/forgot", { email });
  },

  resetPassword(token: string, password: string) {
    return post<void>("/auth/password/reset", { token, password });
  },

  refresh() {
    return post<AuthResponse>("/auth/refresh");
  },

  logout() {
    return post<void>("/auth/logout");
  },

  me(): Promise<AuthUser> {
    return apiFetch<AuthUser>("/users/me");
  },
};

export type { ApiProblem };
