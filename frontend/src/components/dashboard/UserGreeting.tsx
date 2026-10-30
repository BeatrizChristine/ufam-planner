"use client";

import { useAuth } from "@/components/auth/AuthProvider";

export function UserGreeting() {
  const { user } = useAuth();
  const firstName = user?.name.split(" ")[0] ?? "estudante";
  return <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-slate-900 sm:text-4xl">Olá, {firstName}!</h1>;
}

