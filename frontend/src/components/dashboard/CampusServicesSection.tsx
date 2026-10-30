import { ArrowUpRight, FlaskConical, UtensilsCrossed } from "lucide-react";

const services = [
  {
    name: "RU Digital",
    description: "Acesse seus tickets, acompanhe o saldo e consulte o restaurante universitário no sistema da UFAM.",
    href: "https://rudigital.ufam.edu.br/",
    action: "Abrir RU Digital",
    secondaryHref: null,
    secondaryAction: null,
    icon: UtensilsCrossed,
    iconClass: "bg-emerald-100 text-emerald-800",
    borderClass: "hover:border-emerald-300",
  },
  {
    name: "Laboratórios da FEEC",
    description: "Conheça os laboratórios de eletrônica e informática, seus equipamentos e o acesso ao sistema da unidade.",
    href: "https://labsdtec.ufam.edu.br/frontend/web/index.php",
    action: "Conhecer laboratórios",
    secondaryHref: "https://labsdtec.ufam.edu.br/frontend/web/index.php?r=site%2Flogin",
    secondaryAction: "Entrar no sistema",
    icon: FlaskConical,
    iconClass: "bg-sky-100 text-sky-800",
    borderClass: "hover:border-sky-300",
  },
];

export function CampusServicesSection() {
  return (
    <section aria-labelledby="campus-services-title" className="rounded-3xl border border-emerald-100 bg-[#f5faf8] p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-emerald-700">Vida no campus</p>
          <h2 id="campus-services-title" className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">Serviços da UFAM que vale conhecer</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Acessos úteis para o seu dia a dia, além da matriz e do quadro de horários.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {services.map(({ name, description, href, action, secondaryHref, secondaryAction, icon: Icon, iconClass, borderClass }) => (
          <article key={name} className={`flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-colors ${borderClass}`}>
            <span className={`grid size-11 place-items-center rounded-2xl ${iconClass}`}><Icon size={21} aria-hidden="true" /></span>
            <h3 className="mt-4 text-lg font-extrabold text-slate-900">{name}</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{description}</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
              <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-2 text-sm font-bold text-emerald-800 hover:underline">
                {action} <ArrowUpRight size={16} aria-hidden="true" />
              </a>
              {secondaryHref && secondaryAction && (
                <a href={secondaryHref} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-800 hover:underline">
                  {secondaryAction} <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Procurando o cardápio do RU?</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">Veja os cardápios do RU Campus 2026, organizados por mês no Drive.</p>
        </div>
        <a href="https://drive.google.com/drive/folders/1XOveCtWCMoi5i_-BJWgpJiCBrCyK5NzV" target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-emerald-800 hover:underline">
          Consulte o cardápio do RU aqui <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">Os links abrem serviços externos da UFAM. O Planner não acessa suas contas nesses sistemas nem acompanha seus saldos ou reservas.</p>
    </section>
  );
}
