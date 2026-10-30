"use client";

import { CheckCircle2, Database, ExternalLink, LoaderCircle, RefreshCw, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { CatalogCoverageSummary } from "@/components/study/CatalogCoverageSummary";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { ApiError } from "@/services/api-client";
import { studyApi } from "@/services/api";
import { ufamIntegrationApi } from "@/services/integration-api";
import type { UfamIntegrationStatus } from "@/types/integration";
import type { CatalogCoverage } from "@/types/study";

const levels = [
  { id: 3, label: "Graduação regular · Manaus" },
  { id: 13, label: "Educação a distância" },
  { id: 14, label: "Graduação regular · Coari" },
  { id: 15, label: "Graduação regular · Humaitá" },
  { id: 16, label: "Graduação regular · Benjamin Constant" },
  { id: 17, label: "Graduação regular · Itacoatiara" },
  { id: 18, label: "Graduação regular · Parintins" },
  { id: 20, label: "PARFOR" },
  { id: 22, label: "Graduação indígena" },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<UfamIntegrationStatus | null>(null);
  const [coverage, setCoverage] = useState<CatalogCoverage | null>(null);
  const [levelId, setLevelId] = useState(3);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== "ADMIN") {
      return;
    }
    const controller = new AbortController();
    ufamIntegrationApi.status(controller.signal)
      .then(setStatus)
      .catch((reason) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) {
          setError(reason instanceof ApiError ? reason.message : "Não foi possível consultar a integração.");
        }
      })
      .finally(() => setLoading(false));
    studyApi.catalogCoverage(controller.signal).then(setCoverage).catch(() => {});
    return () => controller.abort();
  }, [user?.role]);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setMessage(null);
    try {
      const result = await ufamIntegrationApi.syncCourses(levelId);
      setStatus(await ufamIntegrationApi.status());
      setMessage(`${result.itemsProcessed} cursos foram sincronizados com sucesso.`);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Não foi possível sincronizar o catálogo da UFAM.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleGradeSync() {
    setSyncing(true);
    setError(null);
    setMessage(null);
    try {
      const result = await ufamIntegrationApi.syncGradeBatch();
      setCoverage(await studyApi.catalogCoverage());
      setMessage(result.attempted === 0 ? "Nenhuma grade pendente neste momento." : `${result.imported} grade(s) processada(s); ${result.failed} falha(s). A sincronização automática continuará em segundo plano.`);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Não foi possível processar as próximas grades da UFAM.");
    } finally {
      setSyncing(false);
    }
  }

  if (user?.role !== "ADMIN") {
    return (
      <section className="mx-auto max-w-3xl rounded-3xl border border-amber-100 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-700"><ShieldAlert size={27} /></span>
        <h1 className="mt-5 text-2xl font-extrabold">Área administrativa</h1>
        <p className="mt-2 text-sm text-slate-500">Somente administradores podem executar sincronizações externas.</p>
      </section>
    );
  }

  if (loading) {
    return <div className="grid min-h-[55vh] place-items-center"><LoaderCircle className="animate-spin text-emerald-700" size={30} /></div>;
  }

  return (
    <div className="animate-enter mx-auto max-w-5xl space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-emerald-950 to-emerald-700 p-7 text-white shadow-lg shadow-emerald-950/10 sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">Administração</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Integrações da UFAM</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-100">Sincronize o catálogo público no PostgreSQL para manter o Planner funcionando mesmo quando o serviço externo estiver indisponível.</p>
      </section>

      {error && <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {message && <p role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Database size={22} /></span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-extrabold">Catálogo acadêmico eCampus</h2>
                {status?.lastStatus === "SUCCESS" && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700"><CheckCircle2 size={13} /> Conectado</span>}
              </div>
              <a href={status?.baseUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900">Fonte oficial <ExternalLink size={13} /></a>
            </div>
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <article className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5"><p className="text-xs text-slate-400">Registros de cursos · todas as modalidades</p><strong className="mt-2 block text-2xl">{status?.importedCourses ?? 0}</strong></article>
          <article className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5"><p className="text-xs text-slate-400">Versões descobertas</p><strong className="mt-2 block text-2xl">{status?.discoveredCurriculumVersions ?? 0}</strong></article>
          <article className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5"><p className="text-xs text-slate-400">Última sincronização</p><strong className="mt-2 block text-sm">{status?.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString("pt-BR") : "Ainda não realizada"}</strong></article>
        </div>

        <div className="mt-7 grid gap-3 border-t border-slate-100 pt-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <span className="mb-2 block text-xs font-bold text-slate-600">Catálogo para sincronizar</span>
            <SearchableSelect
              value={String(levelId)}
              onChange={(value) => setLevelId(Number(value))}
              placeholder="Selecione um catálogo"
              disabled={syncing}
              searchable={false}
              options={levels.map((level) => ({ value: String(level.id), label: level.label }))}
            />
          </div>
          <button onClick={() => void handleSync()} disabled={syncing} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
            {syncing ? <LoaderCircle className="animate-spin" size={17} /> : <RefreshCw size={17} />}
            {syncing ? "Sincronizando..." : "Sincronizar agora"}
          </button>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-extrabold">Disciplinas de todos os cursos</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">O Planner lê gradualmente as grades públicas correntes do eCampus. A busca mostra os cursos em cujas grades uma disciplina foi identificada, sem confundir isso com turmas ofertadas no semestre.</p>
        <div className="mt-4">{coverage ? <CatalogCoverageSummary coverage={coverage} /> : <p className="text-sm text-slate-500">Carregando cobertura do catálogo…</p>}</div>
        <button type="button" onClick={() => void handleGradeSync()} disabled={syncing} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
          {syncing ? <LoaderCircle className="animate-spin" size={17} /> : <RefreshCw size={17} />}
          Processar próximas 3 grades
        </button>
      </section>
    </div>
  );
}
