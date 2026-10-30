"use client";

import { BookOpenCheck, CheckCircle2, GraduationCap, LoaderCircle, Save, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { ApiError } from "@/services/api-client";
import { academicProfileApi } from "@/services/api";
import type { AcademicProfile, CourseOption, CurriculumOption } from "@/types/profile";

type FormState = {
  courseId: string;
  curriculumId: string;
  admissionYear: string;
  admissionTerm: string;
  registrationNumber: string;
  currentPeriod: string;
};

const emptyForm: FormState = {
  courseId: "",
  curriculumId: "",
  admissionYear: String(new Date().getFullYear()),
  admissionTerm: "1",
  registrationNumber: "",
  currentPeriod: "",
};

export default function AcademicProfilePage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [curricula, setCurricula] = useState<CurriculumOption[]>([]);
  const [profile, setProfile] = useState<AcademicProfile | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [loadingCurricula, setLoadingCurricula] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const [courseOptions, currentProfile] = await Promise.all([
          academicProfileApi.courses(controller.signal),
          academicProfileApi.get(controller.signal),
        ]);
        const courseId = currentProfile.courseId ?? courseOptions[0]?.id ?? "";
        const curriculumOptions = courseId
          ? await academicProfileApi.curricula(courseId, controller.signal)
          : [];

        setCourses(courseOptions);
        setCurricula(curriculumOptions);
        setProfile(currentProfile);
        setForm({
          courseId,
          curriculumId: currentProfile.curriculumId ?? curriculumOptions[0]?.id ?? "",
          admissionYear: currentProfile.admissionYear?.toString() ?? emptyForm.admissionYear,
          admissionTerm: currentProfile.admissionTerm?.toString() ?? "1",
          registrationNumber: currentProfile.registrationNumber ?? "",
          currentPeriod: currentProfile.currentPeriod?.toString() ?? "",
        });
      } catch (reason) {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) {
          setError(reason instanceof ApiError ? reason.message : "Não foi possível carregar seu perfil acadêmico.");
        }
      } finally {
        setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, []);

  async function handleCourseChange(courseId: string) {
    setForm((current) => ({ ...current, courseId, curriculumId: "" }));
    setCurricula([]);
    setLoadingCurricula(true);
    setError(null);
    try {
      const options = await academicProfileApi.curricula(courseId);
      setCurricula(options);
      setForm((current) => ({ ...current, curriculumId: options[0]?.id ?? "" }));
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Não foi possível carregar as matrizes deste curso.");
    } finally {
      setLoadingCurricula(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const common = {
        courseId: form.courseId,
        admissionYear: Number(form.admissionYear),
        admissionTerm: Number(form.admissionTerm),
      };
      const saved = form.curriculumId
        ? await academicProfileApi.save({
            ...common,
            curriculumId: form.curriculumId,
            registrationNumber: form.registrationNumber.trim() || null,
            currentPeriod: form.currentPeriod ? Number(form.currentPeriod) : null,
          })
        : await academicProfileApi.start(common);
      setProfile(saved);
      setMessage(saved.completed
        ? "Perfil acadêmico salvo. O dashboard já pode usar seus dados reais."
        : "Curso salvo. A matriz será vinculada quando estiver disponível no catálogo.");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Não foi possível salvar o perfil acadêmico.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="grid min-h-[55vh] place-items-center"><LoaderCircle className="animate-spin text-emerald-700" size={30} /></div>;
  }

  return (
    <div className="animate-enter mx-auto max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-950 to-emerald-700 p-7 text-white shadow-lg shadow-emerald-950/10 sm:p-9">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">Minha trajetória</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Perfil acadêmico</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-100">Vincule sua conta ao curso e à matriz correta. Esses dados serão a base do mapa curricular e do seu progresso.</p>
          </div>
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20"><GraduationCap size={31} /></span>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><UserRound size={19} /></span>
            <p className="mt-4 text-xs font-semibold text-slate-400">Conta UFAM Planner</p>
            <strong className="mt-1 block text-base">{user?.name}</strong>
            <p className="mt-1 text-xs text-slate-500">@{user?.username} · {user?.email}</p>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className={`grid size-9 place-items-center rounded-xl ${profile?.completed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {profile?.completed ? <CheckCircle2 size={18} /> : <BookOpenCheck size={18} />}
              </span>
              <div><p className="text-xs text-slate-400">Situação</p><strong className="text-sm">{profile?.completed ? "Perfil configurado" : "Configuração pendente"}</strong></div>
            </div>
          </section>
          <p className="px-1 text-xs leading-5 text-slate-500">O período atual é opcional e apenas informativo. Seu progresso será calculado pelas disciplinas concluídas e pelas regras da matriz.</p>
        </aside>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Vínculo acadêmico</p>
            <h2 className="mt-1 text-xl font-extrabold">Informações do curso</h2>
          </div>

          {error && <p role="alert" className="mb-5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          {message && <p role="status" className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <span className="mb-2 block text-xs font-bold text-slate-600">Curso</span>
              <SearchableSelect
                value={form.courseId}
                onChange={(courseId) => void handleCourseChange(courseId)}
                placeholder="Selecione seu curso"
                searchPlaceholder="Busque pelo nome, código ou campus..."
                emptyMessage="Nenhum curso encontrado."
                options={courses.map((course) => ({
                  value: course.id,
                  label: `${course.code} — ${course.name}`,
                  description: [course.campus, course.unitAbbreviation, course.studyShift].filter(Boolean).join(" · "),
                  keywords: `${course.code} ${course.name} ${course.campus}`,
                  searchText: `${course.code} ${course.name} ${course.campus} ${course.unitName ?? ""} ${course.unitAbbreviation ?? ""} ${course.studyShift ?? ""}`,
                }))}
              />
              {form.courseId && !loadingCurricula && !form.curriculumId && curricula.length === 0 && (
                <p className="mt-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">Este curso ainda não possui matriz estruturada no Planner. Você pode salvar o curso agora e completar o vínculo depois.</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <span className="mb-2 block text-xs font-bold text-slate-600">Matriz curricular</span>
              <SearchableSelect
                value={form.curriculumId}
                onChange={(curriculumId) => setForm((current) => ({ ...current, curriculumId }))}
                placeholder={form.courseId ? "Selecione sua matriz" : "Escolha primeiro um curso"}
                searchPlaceholder="Buscar versão da matriz..."
                emptyMessage="Ainda não há matriz estruturada para este curso."
                disabled={!form.courseId || loadingCurricula}
                options={curricula.map((curriculum) => ({
                  value: curriculum.id,
                  label: `Matriz ${curriculum.code}`,
                  description: `${curriculum.totalWorkloadHours.toLocaleString("pt-BR")} horas · ${curriculum.expectedPeriods} períodos`,
                }))}
              />
            </div>

            <label>
              <span className="mb-2 block text-xs font-bold text-slate-600">Ano de ingresso</span>
              <input required type="number" min="1909" max="2100" value={form.admissionYear} onChange={(event) => setForm((current) => ({ ...current, admissionYear: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50" />
            </label>
            <div>
              <span className="mb-2 block text-xs font-bold text-slate-600">Semestre de ingresso</span>
              <SearchableSelect
                value={form.admissionTerm}
                onChange={(admissionTerm) => setForm((current) => ({ ...current, admissionTerm }))}
                placeholder="Selecione o semestre"
                searchable={false}
                options={[{ value: "1", label: "1º semestre" }, { value: "2", label: "2º semestre" }]}
              />
            </div>
            <label>
              <span className="mb-2 block text-xs font-bold text-slate-600">Matrícula <span className="font-normal text-slate-400">(opcional)</span></span>
              <input maxLength={40} value={form.registrationNumber} onChange={(event) => setForm((current) => ({ ...current, registrationNumber: event.target.value }))} placeholder="Ex.: 22350000" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50" />
            </label>
            <label>
              <span className="mb-2 block text-xs font-bold text-slate-600">Período atual <span className="font-normal text-slate-400">(opcional)</span></span>
              <input type="number" min="1" max="20" value={form.currentPeriod} onChange={(event) => setForm((current) => ({ ...current, currentPeriod: event.target.value }))} placeholder="Ex.: 5" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50" />
            </label>
          </div>

          <button disabled={saving || !form.courseId} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
            {saving ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}
            {saving ? "Salvando..." : "Salvar perfil acadêmico"}
          </button>
        </form>
      </div>
    </div>
  );
}
