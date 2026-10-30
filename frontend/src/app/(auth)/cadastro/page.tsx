"use client";

import { AlertCircle, ArrowRight, AtSign, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { AuthApiError } from "@/services/auth-api";

const inputShell = "mt-1.5 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100";
const inputClass = "min-w-0 w-full bg-transparent text-xs font-normal outline-none placeholder:text-slate-400";

export default function CadastroPage() {
  const router = useRouter();
  const { register, googleLogin, status } = useAuth();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "", confirmation: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [router, status]);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirmation) {
      setError("As senhas informadas não coincidem.");
      return;
    }
    setSubmitting(true);
    try {
      await register({ name: form.name, username: form.username, email: form.email, password: form.password });
      sessionStorage.setItem("pending-verification-email", form.email.trim().toLowerCase());
      router.replace("/verificar-email");
    } catch (reason) {
      setError(reason instanceof AuthApiError ? reason.message : "Não foi possível criar sua conta. Verifique sua conexão.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-enter w-full">
      <div className="text-center">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.24em] text-emerald-700">Seu primeiro acesso</p>
        <h2 className="mt-1.5 text-[clamp(1.8rem,4vh,2.4rem)] font-black leading-none tracking-[-0.045em] text-slate-950">Crie sua conta</h2>
        <p className="mt-2 text-xs text-slate-500">Crie sua conta e confirme seu e-mail com um código.</p>
      </div>

      <div className="mt-3"><GoogleSignInButton mode="signup" onCredential={(credential) => {
        setSubmitting(true); setError("");
        void googleLogin(credential).then(() => router.replace("/dashboard"))
          .catch((reason) => setError(reason instanceof AuthApiError ? reason.message : "Não foi possível criar a conta com Google."))
          .finally(() => setSubmitting(false));
      }} /></div>
      <div className="my-2.5 flex items-center gap-3 text-[8px] font-bold uppercase tracking-widest text-slate-300"><span className="h-px flex-1 bg-slate-200" /> ou use seus dados <span className="h-px flex-1 bg-slate-200" /></div>

      {error && <div role="alert" className="mb-2.5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-semibold text-rose-700"><AlertCircle className="mt-0.5 shrink-0" size={13} />{error}</div>}

      <form className="grid grid-cols-2 gap-x-3 gap-y-2" onSubmit={handleSubmit}>
        <label className="min-w-0 text-[10px] font-bold text-slate-700">Nome completo
          <span className={inputShell}><UserRound size={14} className="shrink-0 text-slate-400" /><input value={form.name} onChange={(event) => update("name", event.target.value)} required autoComplete="name" className={inputClass} placeholder="Seu nome" /></span>
        </label>
        <label className="min-w-0 text-[10px] font-bold text-slate-700">Username
          <span className={inputShell}><AtSign size={14} className="shrink-0 text-slate-400" /><input value={form.username} onChange={(event) => update("username", event.target.value)} required autoComplete="username" className={inputClass} placeholder="beatriz.dev" /></span>
        </label>
        <label className="col-span-2 min-w-0 text-[10px] font-bold text-slate-700">E-mail
          <span className={inputShell}><Mail size={14} className="shrink-0 text-slate-400" /><input value={form.email} onChange={(event) => update("email", event.target.value)} required type="email" autoComplete="email" className={inputClass} placeholder="seuemail@ufam.edu.br" /></span>
        </label>
        <label className="min-w-0 text-[10px] font-bold text-slate-700">Senha
          <span className={inputShell}>
            <LockKeyhole size={14} className="shrink-0 text-slate-400" /><input value={form.password} onChange={(event) => update("password", event.target.value)} required minLength={8} maxLength={72} type={showPassword ? "text" : "password"} autoComplete="new-password" className={inputClass} placeholder="Mínimo 8 caracteres" />
            <button type="button" onClick={() => setShowPassword((current) => !current)} className="shrink-0 text-slate-400 hover:text-emerald-700" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff size={14} /> : <Eye size={14} />}</button>
          </span>
        </label>
        <label className="min-w-0 text-[10px] font-bold text-slate-700">Confirmar senha
          <span className={inputShell}>
            <LockKeyhole size={14} className="shrink-0 text-slate-400" /><input value={form.confirmation} onChange={(event) => update("confirmation", event.target.value)} required type={showConfirmation ? "text" : "password"} autoComplete="new-password" className={inputClass} placeholder="Repita a senha" />
            <button type="button" onClick={() => setShowConfirmation((current) => !current)} className="shrink-0 text-slate-400 hover:text-emerald-700" aria-label={showConfirmation ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"}>{showConfirmation ? <EyeOff size={14} /> : <Eye size={14} />}</button>
          </span>
        </label>
        <button disabled={submitting} className="col-span-2 mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-800/15 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? <><LoaderCircle className="animate-spin" size={15} /> Enviando código...</> : <>Criar conta e receber código <ArrowRight size={15} /></>}
        </button>
      </form>
      <p className="mt-3 text-center text-[10px] text-slate-400">Já possui conta? <Link href="/login" className="font-bold text-emerald-700">Entrar</Link></p>
      <p className="mt-1 text-center text-[10px] text-slate-400">Já se cadastrou? <Link href="/verificar-email" className="font-bold text-emerald-700">Confirmar e-mail</Link></p>
    </div>
  );
}
