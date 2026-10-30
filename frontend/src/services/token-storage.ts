const TOKEN_KEY = "ufam_planner_access_token";

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(TOKEN_KEY);
}

export function storeAccessToken(token: string) {
  if (typeof window !== "undefined") window.sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken() {
  if (typeof window !== "undefined") window.sessionStorage.removeItem(TOKEN_KEY);
}
