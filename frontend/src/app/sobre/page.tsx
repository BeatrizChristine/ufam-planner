import type { Metadata } from "next";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = { title: "Fontes e termo de uso" };

const sources = [
  { name: "Grades curriculares do eCampus", url: "https://ecampus.ufam.edu.br/ecampus/gradesCurriculares", text: "Códigos, disciplinas, cargas horárias e pré-requisitos, respeitando a versão da matriz." },
  { name: "Diretório de graduação da UFAM", url: "https://www.ufam.edu.br/graduacao.html", text: "Identificação de cursos e unidades acadêmicas. Não identifica o curso ofertante de cada turma." },
  { name: "Orientações acadêmicas da UFAM", url: "https://cienciassociais.ufam.edu.br/duvidas-frequentes.html", text: "Referência institucional para a frequência mínima de 75%. A situação oficial é a registrada pela UFAM." },
];

export default function AboutPage() {
  return <main className="mx-auto max-w-4xl space-y-7 px-5 py-8 sm:px-8 sm:py-12">
    <header className="flex flex-wrap items-center justify-between gap-4"><Link href="/" aria-label="UFAM Planner, início"><Logo /></Link><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800"><ArrowLeft size={16} /> Voltar ao painel</Link></header>
    <section className="rounded-3xl bg-[#063e31] p-7 text-white sm:p-9"><ShieldCheck size={30} className="text-emerald-300" /><p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">Transparência acadêmica</p><h1 className="mt-2 text-3xl font-extrabold">Fontes e termo de uso</h1><p className="mt-3 text-sm leading-6 text-emerald-50/80">Referências oficiais em um lugar só. O UFAM Planner é uma ferramenta independente, não um serviço oficial da Universidade Federal do Amazonas.</p></section>
    <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8"><h2 className="text-xl font-extrabold">De onde vêm os dados?</h2><div className="mt-5 divide-y divide-slate-100">{sources.map((source) => <div key={source.url} className="py-4 first:pt-0"><a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:underline">{source.name}<ExternalLink size={14} /></a><p className="mt-2 text-sm leading-6 text-slate-500">{source.text}</p></div>)}</div><div className="mt-3 rounded-2xl bg-emerald-50 p-4"><h3 className="text-sm font-bold text-emerald-950">Seus documentos do eCampus</h3><p className="mt-2 text-sm leading-6 text-emerald-900">O histórico escolar identifica aprovações e dispensas; o comprovante de matrícula identifica as turmas e os horários em que você está efetivamente matriculado. Um catálogo de disciplinas ou uma oferta pública não comprova sua matrícula.</p></div></section>
    <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8"><h2 className="text-xl font-extrabold">Termo de uso e limites da ferramenta</h2><div className="mt-5 space-y-5 text-sm leading-6 text-slate-600">
      <div><h3 className="font-bold text-slate-900">1. Planejamento não é registro oficial</h3><p>O Planner organiza informações de fontes institucionais e documentos que você fornece. Matrícula, aproveitamento de optativas, integralização, notas e reprovações dependem da confirmação no eCampus e pela coordenação do curso.</p></div>
      <div><h3 className="font-bold text-slate-900">2. Revisão e atualização</h3><p>Confira a prévia antes de importar e use documentos atualizados. Dados importados são exibidos para consulta; alterações de matrícula ou de horário devem ser atualizadas por um novo comprovante. Não inferimos o curso ofertante somente pelo nome da matéria ou pelo código da turma.</p></div>
      <div><h3 className="font-bold text-slate-900">3. Progresso e frequência são estimativas</h3><p>O progresso usa aprovações identificadas no histórico e as exigências da matriz vinculada. As faltas são registros pessoais em horas; a margem considera 25% da carga horária, sem avaliar justificativas, feriados, reposições ou ajustes da UFAM. Não usamos a estimativa para declarar uma reprovação oficial.</p></div>
      <div><h3 className="font-bold text-slate-900">4. Rascunhos são separados da matrícula</h3><p>O planejamento opcional pelo catálogo não cria matrícula nem confirma oferta ou vaga. Um rascunho não entra automaticamente no seu progresso ou no acompanhamento de turmas importadas.</p></div>
      <div><h3 className="font-bold text-slate-900">5. Documentos e credenciais</h3><p>Os PDFs são enviados à API para análise e não são guardados pelo Planner. Os dados acadêmicos confirmados ficam no seu perfil. Não informe sua senha do eCampus: não há acesso automático à sua conta institucional.</p></div>
    </div></section>
    <p className="text-xs leading-5 text-slate-500">As publicações de turmas encontradas são distribuídas por unidades acadêmicas e semestres. Ainda não há, no Planner, uma integração abrangente e validada com essas ofertas. Por isso, o comprovante continua sendo a fonte para montar sua matrícula real.</p>
  </main>;
}
