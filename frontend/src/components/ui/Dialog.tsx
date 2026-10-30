"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

export function Dialog({ title, subtitle, onClose, children, wide = false }: {
  title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  const titleId = useId();
  const modal = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const element = modal.current;
    if (!element) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // The browser top layer escapes animated ancestors and stays above the app header.
    element.showModal();
    panel.current?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") { event.preventDefault(); close.current(); }
      if (event.key !== "Tab") return;
      const controls = Array.from(element!.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]')).filter((control) => control.getClientRects().length > 0);
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", handleKey);
    return () => { element.close(); document.body.style.overflow = overflow; document.removeEventListener("keydown", handleKey); previouslyFocused?.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={modal} role="dialog" aria-modal="true" aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose(); }} className="fixed inset-0 z-50 m-0 hidden h-[100dvh] max-h-none w-full max-w-none items-center justify-center border-0 bg-transparent p-3 text-slate-900 open:flex backdrop:bg-emerald-950/45 backdrop:backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={panel} data-dialog-panel tabIndex={-1} className={`flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl outline-none ${wide ? "max-w-3xl" : "max-w-xl"}`}>
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6"><div><h2 id={titleId} className="text-xl font-extrabold text-slate-900">{title}</h2>{subtitle && <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>}</div><button onClick={onClose} type="button" aria-label="Fechar" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></header>
      <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6">{children}</div>
    </div>
  </dialog>;
}
