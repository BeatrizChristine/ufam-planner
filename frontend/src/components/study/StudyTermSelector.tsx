"use client";

import { CalendarDays } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

export function StudyTermSelector({ terms, value, onChange, loading = false }: {
  terms: string[];
  value: string | null;
  onChange: (term: string) => void;
  loading?: boolean;
}) {
  const description = (term: string) => {
    const [year, semester] = term.split("/");
    return `${semester}º semestre de ${year}`;
  };

  return <div className="flex flex-wrap items-center gap-3">
    <span className="flex items-center gap-2 text-xs font-extrabold text-emerald-950"><CalendarDays size={17} className="text-emerald-700" /> Período letivo</span>
    {loading ? <span className="text-sm text-slate-500">Carregando períodos…</span> : terms.length > 1 ? <div className="w-full max-w-[270px]">
      <SearchableSelect value={value ?? ""} options={terms.map((term) => ({ value: term, label: term, description: description(term) }))} onChange={onChange} placeholder="Escolha o semestre" searchable={false} />
    </div> : value ? <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
      <strong className="text-sm text-emerald-900">{value}</strong><span className="text-xs text-emerald-800">{description(value)}</span>
    </div> : <span className="text-sm text-slate-500">Importe o comprovante ou defina o período de uma disciplina.</span>}
  </div>;
}
