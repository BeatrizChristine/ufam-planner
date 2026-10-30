"use client";

import { ArrowLeft, CheckCircle2, Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { authApi, AuthApiError } from "@/services/auth-api";

export default function ResetPasswordPage() {
  const token = useRef<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    token.current = new URLSearchParams(window.location.hash.slice(1)).get("token");
    window.history.replaceState(window.history.state, "", "/redefinir-senha");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token.current) { setError("O link de recuperação está incompleto. Solicite outro."); return; }
    if (password !== confirmation) { setError("As senhas não coincidem."); return; }
    setBusy(true); setError("");
    try {
      await authApi.resetPassword(token.current, password);
      token.current = null;
      setDone(true);
    } catch (reason) {
      setError(reason instanceof AuthApiError ? reason.message : "Não foi possível redefinir a senha. Solicite um novo link.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="animate-enter w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_24px_80px_-30px_rgb(0_61_41_/_0.22)] sm:p-9">
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Recuperar acesso</p>
    <h2 className="mt-3 text-3xl font-extrabold tracking-tight">Nova senha</h2>
    {done ? <div role="status" className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><CheckCircle2 size={20} className="mb-2" />Sua senha foi alterada. Entre novamente com a nova senha.</div> : <>
      <p className="mt-3 text-sm leading-6 text-slate-500">Escolha uma senha de 8 a 72 caracteres. O link só pode ser usado uma vez.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-xs font-bold text-slate-700">Nova senha
          <span className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-3.5 focus-within:border-emerald-600"><LockKeyhole size={16} className="text-slate-400" /><input value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={72} autoComplete="new-password" type={showPassword ? "text" : "password"} className="min-w-0 flex-1 bg-transparent text-sm outline-none" /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} className="text-slate-400">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span>
        </label>
        <label className="block text-xs font-bold text-slate-700">Confirme a senha
          <span className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-3.5 focus-within:border-emerald-600"><LockKeyhole size={16} className="text-slate-400" /><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required autoComplete="new-password" type="password" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></span>
        </label>
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">{busy && <LoaderCircle size={16} className="animate-spin" />}{busy ? "Salvando..." : "Salvar nova senha"}</button>
      </form>
    </>}
    <Link href="/login" className="mt-6 flex items-center justify-center gap-2 text-xs font-bold text-emerald-700"><ArrowLeft size={14} /> Voltar ao login</Link>
  </div>;
}
