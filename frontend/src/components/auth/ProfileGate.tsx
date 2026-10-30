"use client";

import { AlertCircle, LoaderCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { academicProfileApi } from "@/services/api";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "./AuthProvider";

export function ProfileGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user || user.role === "ADMIN") return;

    const controller = new AbortController();
    academicProfileApi.get(controller.signal)
      .then((profile) => {
        if (!profile.courseId) router.replace("/onboarding");
        else setChecking(false);
      })
      .catch((reason) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) {
          setError(true);
        }
      });

    return () => controller.abort();
  }, [router, user]);

  if (!user || user.role === "ADMIN" || !checking) return children;

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-5">
        <div className="w-full max-w-md rounded-2xl border border-rose-100 bg-white p-7 text-center shadow-sm">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-600"><AlertCircle size={23} /></span>
          <h1 className="mt-4 text-lg font-extrabold text-slate-900">Não foi possível verificar seu perfil</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Confira se a API está disponível e tente novamente para continuar com segurança.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800"><RefreshCw size={16} /> Tentar novamente</button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50">
      <div className="flex flex-col items-center gap-5">
        <Logo />
        <LoaderCircle className="animate-spin text-emerald-700" size={24} />
        <p className="text-xs font-semibold text-slate-400">Preparando seu perfil acadêmico...</p>
      </div>
    </div>
  );
}
