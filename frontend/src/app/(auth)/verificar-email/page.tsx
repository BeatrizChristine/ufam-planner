"use client";

import { CheckCircle2, LoaderCircle, Mail } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { authApi, AuthApiError } from "@/services/auth-api";

export default function VerifyEmailPage() {
  const [email, setEmail] = useState(() =>
    typeof window === "undefined" ? "" : sessionStorage.getItem("pending-verification-email") ?? "");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [done, setDone] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await authApi.verifyEmail(email, code);
      sessionStorage.removeItem("pending-verification-email");
      setDone(true);
    } catch (reason) {
      setError(reason instanceof AuthApiError ? reason.message : "Não foi possível confirmar o código.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!email.trim()) { setError("Informe seu e-mail para reenviar o código."); return; }
    setResending(true);
    setError("");
    setNotice("");
    try {
      await authApi.resendVerification(email);
      setNotice("Se a conta estiver aguardando confirmação, enviaremos um novo código. Aguarde até um minuto entre envios.");
    } catch (reason) {
      setError(reason instanceof AuthApiError ? reason.message : "Não foi possível solicitar outro código.");
    } finally {
      setResending(false);
    }
  }

  return <div className="animate-enter w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_24px_80px_-30px_rgb(0_61_41_/_0.22)] sm:p-9">
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Mais um passo</p>
    <h2 className="mt-3 text-3xl font-extrabold tracking-tight">Confirme seu e-mail</h2>
    {done ? <div role="status" className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
      <CheckCircle2 size={20} className="mb-2" /> E-mail confirmado! Sua conta está pronta.
      <Link href="/login" className="mt-3 block font-bold underline">Entrar no Planner</Link>
    </div> : <>
      <p className="mt-3 text-sm leading-6 text-slate-600">Enviamos um código de 6 dígitos para o e-mail do cadastro. Ele vale por 10 minutos.</p>
      <form onSubmit={verify} className="mt-6 space-y-4">
        <label className="block text-xs font-bold text-slate-700">E-mail
          <span className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3"><Mail size={16} className="text-slate-400" /><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full bg-transparent text-sm font-normal outline-none" placeholder="seuemail@exemplo.com" /></span>
        </label>
        <label className="block text-xs font-bold text-slate-700">Código de confirmação
          <input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-xl font-bold tracking-[0.35em] outline-none focus:border-emerald-600" placeholder="000000" />
        </label>
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}
        {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</p>}
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">{busy && <LoaderCircle size={16} className="animate-spin" />}{busy ? "Confirmando..." : "Confirmar e-mail"}</button>
      </form>
      <button type="button" disabled={resending} onClick={() => void resend()} className="mt-4 w-full text-center text-xs font-bold text-emerald-700 hover:underline disabled:opacity-60">{resending ? "Solicitando..." : "Não recebeu? Reenviar código"}</button>
      {(process.env.NEXT_PUBLIC_MAIL_TEST_MODE === "true" || process.env.NODE_ENV === "development") && <p className="mt-4 text-center text-xs leading-5 text-slate-500">No Docker local, veja o código na <a href="http://localhost:8025" target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-700 underline">caixa de testes</a>. Ela não entrega e-mails reais.</p>}
    </>}
    <Link href="/login" className="mt-5 block text-center text-xs font-bold text-emerald-700">Voltar ao login</Link>
  </div>;
}
