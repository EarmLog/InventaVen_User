export const TASA_MINIMA_VALIDA = 10;
export const CAIDA_MAXIMA_TASA = 0.1;

export function tasaEsValida(tasa) {
  const numero = Number(tasa);
  return Number.isFinite(numero) && numero >= TASA_MINIMA_VALIDA;
}

export function tasaBajoSospechosa(nueva, anterior) {
  const tasaNueva = Number(nueva);
  const tasaAnterior = Number(anterior);
  if (!Number.isFinite(tasaNueva) || tasaNueva <= 0) return true;
  if (!Number.isFinite(tasaAnterior) || tasaAnterior <= 0) return false;
  return tasaNueva <= tasaAnterior * (1 - CAIDA_MAXIMA_TASA);
}

export function evaluarTasa(nueva, anterior) {
  const tasaNueva = Number(nueva);
  const tasaAnterior = Number(anterior);

  if (!Number.isFinite(tasaNueva) || tasaNueva <= 0) {
    return {
      valida: false,
      motivo: "La tasa recibida no es un número válido.",
    };
  }

  if (tasaNueva < TASA_MINIMA_VALIDA) {
    return {
      valida: false,
      motivo: `La tasa ${tasaNueva} parece un valor predeterminado y no se aplicó. Revisa la tasa manual.`,
    };
  }

  if (tasaBajoSospechosa(tasaNueva, tasaAnterior)) {
    return {
      valida: false,
      motivo: `La tasa bajó ${Math.round(
        (1 - tasaNueva / tasaAnterior) * 100
      )}% respecto a la última guardada. No se aplicó automáticamente para no estropear los precios.`,
    };
  }

  return { valida: true, motivo: "" };
}
