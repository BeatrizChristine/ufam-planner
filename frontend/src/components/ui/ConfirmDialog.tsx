"use client";

import { AlertTriangle, LoaderCircle, Trash2 } from "lucide-react";
import { Dialog } from "./Dialog";

export function ConfirmDialog({ title, subject, description, warning, confirmLabel, busy = false, error, onClose, onConfirm }: {
  title: string;
  subject: string;
  description: string;
  warning?: string;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return <Dialog title={title} onClose={onClose}>
    <div className="flex items-start gap-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-700"><Trash2 size={20} /></span>
      <div className="min-w-0">
        <p className="text-sm leading-6 text-slate-600">{description}</p>
        <p className="mt-3 break-words rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-900">{subject}</p>
      </div>
    </div>
    {warning && <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{warning}</p>}
    {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
    <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
      <button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
      <button type="button" disabled={busy} onClick={onConfirm} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-800 disabled:cursor-wait disabled:opacity-60">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}{busy ? "Removendo..." : confirmLabel}</button>
    </div>
  </Dialog>;
}
