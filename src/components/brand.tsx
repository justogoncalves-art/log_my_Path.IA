export function BrandMark({ size = 46 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center rounded-full border border-celeste font-display text-celeste"
      style={{ width: size, height: size, fontSize: size * 0.3 }}
    >
      M
    </span>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <BrandMark size={compact ? 32 : 46} />
      <span className="flex flex-col border-l border-line pl-3 leading-tight">
        <span className={`font-brand font-bold tracking-[0.08em] ${compact ? "text-[11px]" : "text-sm"}`}>
          MY PATH. IA
        </span>
        <span className={`text-muted ${compact ? "text-[9px]" : "text-xs"}`}>Build your tomorrow</span>
      </span>
    </span>
  );
}
