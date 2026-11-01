"use client";

export default function Interruptor({
  activo = false,
  onCambio,
  etiqueta,
  descripcion,
  disabled = false,
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-[var(--texto)]">{etiqueta}</p>
        {descripcion ? (
          <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-[var(--texto-suave)]">
            {descripcion}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={activo}
        disabled={disabled}
        onClick={() => onCambio?.(!activo)}
        className={[
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors",
          activo ? "bg-[var(--primario)]" : "bg-[var(--borde-fuerte)]",
          disabled ? "cursor-not-allowed opacity-50" : "",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            activo ? "left-[22px]" : "left-0.5",
          ].join(" ")}
        />
      </button>
    </div>
  );
}
