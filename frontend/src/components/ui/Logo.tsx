import { GraduationCap } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-emerald-700 text-white shadow-sm shadow-emerald-900/20">
        <GraduationCap size={21} strokeWidth={2.4} />
      </span>
      {!compact && (
        <div className="leading-none">
          <div className="text-[17px] font-extrabold tracking-[-0.04em]">
            <span className="text-emerald-700">UFAM</span> Planner
          </div>
          <div className="mt-1 text-[9px] font-medium text-slate-400">Planeje hoje. Conquiste o amanhã.</div>
        </div>
      )}
    </div>
  );
}

