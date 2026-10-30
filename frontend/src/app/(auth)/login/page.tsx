"use client";

import { AlertCircle, ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { AuthApiError } from "@/services/auth-api";

export default function LoginPage() {
  const router = useRouter();
  const { login, googleLogin, status } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [router, status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNeedsVerification(false);
    try {
      await login(identifier, password);
      router.replace("/dashboard");
    } catch (reason) {
      setError(reason instanceof AuthApiError ? reason.message : "Não foi possível entrar. Verifique sua conexão.");
      setNeedsVerification(reason instanceof AuthApiError && reason.problem?.code === "email_not_verified");
      if (reason instanceof AuthApiError && reason.problem?.code === "email_not_verified" && identifier.includes("@")) {
        sessionStorage.setItem("pending-verification-email", identifier.trim().toLowerCase());
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-enter w-full">
      <div className="text-center">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.24em] text-emerald-700">Acesse sua conta</p>
        <h2 className="mt-2 text-[clamp(2rem,4.5vh,2.8rem)] font-black leading-none tracking-[-0.045em] text-slate-950">Bem-vindo de volta!</h2>
        <p className="mx-auto mt-3 max-w-sm text-xs leading-5 text-slate-500">Entre com seu e-mail ou username e continue planejando sua jornada na UFAM.</p>
      </div>

      {error && <div role="alert" className="mt-6 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700"><AlertCircle className="mt-0.5 shrink-0" size={15} /><span>{error}{needsVerification && <> <Link href="/verificar-email" className="underline">Digitar código</Link></>}</span></div>}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-[11px] font-bold text-slate-700">
          E-mail ou username
          <span className="mt-1.5 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
            <UserRound size={16} className="text-slate-400" />
            <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} required autoComplete="username" className="w-full bg-transparent text-sm font-normal outline-none" placeholder="seuemail@ufam.edu.br ou @username" />
          </span>
        </label>
        <label className="block text-[11px] font-bold text-slate-700">
          Senha
          <span className="mt-1.5 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
            <LockKeyhole size={16} className="text-slate-400" />
            <input value={password} onChange={(event) => setPassword(event.target.value)} required type={showPassword ? "text" : "password"} autoComplete="current-password" className="w-full bg-transparent text-sm font-normal outline-none" placeholder="Digite sua senha" />
            <button type="button" onClick={() => setShowPassword((current) => !current)} className="text-slate-400 hover:text-emerald-700" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </span>
        </label>
        <div className="text-right"><Link href="/recuperar-senha" className="text-xs font-bold text-emerald-700 hover:text-emerald-800">Esqueci minha senha</Link></div>
        <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-800/15 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? <><LoaderCircle className="animate-spin" size={16} /> Entrando...</> : <>Entrar <ArrowRight size={16} /></>}
        </button>
      </form>
      <div className="my-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-300"><span className="h-px flex-1 bg-slate-200" /> ou <span className="h-px flex-1 bg-slate-200" /></div>
      <GoogleSignInButton mode="signin" onCredential={(credential) => {
        setSubmitting(true); setError("");
        void googleLogin(credential).then(() => router.replace("/dashboard"))
          .catch((reason) => setError(reason instanceof AuthApiError ? reason.message : "Não foi possível entrar com Google."))
          .finally(() => setSubmitting(false));
      }} />
      <div className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-center">
        <p className="text-[10px] font-bold text-emerald-900">É seu primeiro acesso?</p>
        <p className="mt-1 text-[10px] text-emerald-800/65">Crie sua conta antes de tentar entrar.</p>
      </div>
      <p className="mt-4 text-center text-[11px] text-slate-400">Ainda não possui conta? <Link href="/cadastro" className="font-bold text-emerald-700">Criar conta</Link></p>
    </div>
  );
}
