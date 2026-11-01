"use client";

export default function Campo({
  etiqueta,
  ayuda,
  error,
  requerido = false,
  children,
  className = "",
}) {
  return (
    <label className={["block", className].join(" ")}>
      {etiqueta ? (
        <span className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
          {etiqueta}
          {requerido ? <span className="text-[var(--peligro)]">*</span> : null}
        </span>
      ) : null}
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-medium text-[var(--peligro)]">
          {error}
        </span>
      ) : ayuda ? (
        <span className="mt-1 block text-xs text-[var(--texto-tenue)]">{ayuda}</span>
      ) : null}
    </label>
  );
}
