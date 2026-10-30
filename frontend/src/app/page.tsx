import { ArrowRight, BookOpenCheck, CalendarDays, Clock3, FileText, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { AcademicNotice } from "@/components/ui/AcademicNotice";

const features = [
  {
    icon: BookOpenCheck,
    title: "Seu mapa curricular",
    text: "Veja as disciplinas concluídas no fluxo do curso e acompanhe seu progresso, inclusive nas optativas.",
  },
  {
    icon: CalendarDays,
    title: "Seu quadro de horários",
    text: "Organize as turmas e os horários do semestre a partir do comprovante de matrícula.",
  },
  {
    icon: Clock3,
    title: "Suas faltas sob controle",
    text: "Registre faltas e acompanhe a margem estimada em cada disciplina.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-5 py-6 sm:px-8 sm:py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/" aria-label="UFAM Planner, início"><Logo /></Link>
        <Link href="/login" className="rounded-xl border border-emerald-200 bg-white px-5 py-2.5 text-sm font-bold text-emerald-800 transition-colors hover:bg-emerald-50">
          Entrar no meu Planner
        </Link>
      </header>

      <section className="relative overflow-hidden rounded-[2rem] bg-[#063e31] px-6 py-10 text-white shadow-xl shadow-emerald-950/10 sm:px-10 sm:py-12 lg:px-12">
        <div className="pointer-events-none absolute -right-24 -top-20 size-96 rounded-full border-[60px] border-emerald-200/5" />
        <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)] lg:items-center lg:gap-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Seu curso, mais claro</p>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Sua trajetória na UFAM, <span className="text-emerald-300">matéria por matéria.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-emerald-50/85">
              Reúna seu progresso, seus horários e suas faltas em um só lugar. Comece com os documentos que você já tem no eCampus.
            </p>
            <Link href="/cadastro" className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-emerald-600">
              Começar meu planejamento <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <p className="mt-4 text-xs leading-5 text-emerald-100/75">Você revisa as informações antes de adicionar. Não pedimos sua senha do eCampus.</p>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 p-5 shadow-2xl shadow-emerald-950/20 backdrop-blur-sm sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">Como começar</p>
            <h2 className="mt-2 text-xl font-extrabold">Seus documentos fazem o trabalho inicial</h2>
            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-3 rounded-2xl bg-white p-4 text-slate-900">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><FileText size={19} aria-hidden="true" /></span>
                <div><p className="text-sm font-extrabold">Histórico escolar</p><p className="mt-1 text-xs leading-5 text-slate-600">Identifica aprovações para o mapa curricular.</p></div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-white p-4 text-slate-900">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><CalendarDays size={19} aria-hidden="true" /></span>
                <div><p className="text-sm font-extrabold">Comprovante de matrícula</p><p className="mt-1 text-xs leading-5 text-slate-600">Traz as disciplinas e os horários do semestre.</p></div>
              </div>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs leading-5 text-emerald-50/85"><ShieldCheck size={16} className="shrink-0" aria-hidden="true" /> Os dados importados passam pela sua confirmação.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="features-title">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Tudo no mesmo lugar</p>
        <h2 id="features-title" className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">Do histórico à rotina do semestre</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6">
              <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon size={23} aria-hidden="true" /></span>
              <h3 className="mt-4 text-base font-extrabold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <AcademicNotice />
      <footer className="pb-4 text-center text-xs text-slate-500">UFAM Planner · Projeto independente de organização acadêmica</footer>
    </main>
  );
}
