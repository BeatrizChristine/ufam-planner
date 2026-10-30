export type AuthUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "STUDENT" | "ADMIN";
  emailVerified: boolean;
};

export type AuthResponse = {
  accessToken: string;
  tokenType: "Bearer";
  expiresAt: string;
  user: AuthUser;
};

export type RegisterPayload = {
  name: string;
  username: string;
  email: string;
  password: string;
};

export type ApiProblem = {
  title?: string;
  detail?: string;
  code?: string;
  fields?: Record<string, string>;
};

