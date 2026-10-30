type ProgressRingProps = {
  value: number;
  label?: string;
  size?: "sm" | "lg";
};

export function ProgressRing({ value, label, size = "lg" }: ProgressRingProps) {
  const dimensions = size === "lg" ? "size-32" : "size-24";
  return (
    <div
      className={`relative grid ${dimensions} shrink-0 place-items-center rounded-full`}
      style={{ background: `conic-gradient(var(--brand-600) ${value * 3.6}deg, #e7f1ec 0deg)` }}
      role="img"
      aria-label={`${value}% ${label ?? "concluído"}`}
    >
      <div className="grid size-[82%] place-items-center rounded-full bg-white text-center shadow-[inset_0_0_0_1px_#edf2ef]">
        <div>
          <strong className={size === "lg" ? "text-3xl" : "text-2xl"}>{value}%</strong>
          {label && <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>}
        </div>
      </div>
    </div>
  );
}

