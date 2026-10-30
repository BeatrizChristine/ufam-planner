"use client";

import { ArrowLeft, CheckCircle2, LoaderCircle, Mail } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { authApi, AuthApiError } from "@/services/auth-api";

export default function RecoverPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (reason) {
      setError(reason instanceof AuthApiError ? reason.message : "Não foi possível solicitar a recuperação. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="animate-enter w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_24px_80px_-30px_rgb(0_61_41_/_0.22)] sm:p-9">
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Recuperar acesso</p>
    <h2 className="mt-3 text-3xl font-extrabold tracking-tight">Esqueceu a senha?</h2>
    <p className="mt-3 text-sm leading-6 text-slate-500">Informe o e-mail da conta. Se ela existir e tiver senha, enviaremos um link válido por 30 minutos.</p>
    {sent ? <div role="status" className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
      <div className="flex items-start gap-2"><CheckCircle2 size={18} className="mt-0.5 shrink-0" /><p>Se houver uma conta com esse e-mail, as instruções foram enviadas. Confira também a pasta de spam.</p></div>
      {(process.env.NEXT_PUBLIC_MAIL_TEST_MODE === "true" || process.env.NODE_ENV === "development") && <p className="mt-3 text-xs">Se estiver usando o Docker local, consulte a <a href="http://localhost:8025" target="_blank" rel="noopener noreferrer" className="font-bold underline">caixa de testes</a>. Ela não entrega e-mails reais.</p>}
    </div> : <form onSubmit={submit}>
      <label className="mt-7 block text-xs font-bold text-slate-700">E-mail
        <span className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-3.5 focus-within:border-emerald-600"><Mail size={16} className="text-slate-400" /><input value={email} onChange={(event) => setEmail(event.target.value)} required type="email" autoComplete="email" className="w-full bg-transparent text-sm font-normal outline-none" placeholder="seuemail@ufam.edu.br" /></span>
      </label>
      {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}
      <button disabled={busy} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">{busy && <LoaderCircle size={16} className="animate-spin" />}{busy ? "Enviando..." : "Enviar instruções"}</button>
    </form>}
    <Link href="/login" className="mt-6 flex items-center justify-center gap-2 text-xs font-bold text-emerald-700"><ArrowLeft size={14} /> Voltar ao login</Link>
  </div>;
}
