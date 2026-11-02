const registros = new Map();
const LIMPIEZA_MS = 10 * 60 * 1000;

function obtenerIp(request) {
  const reenviada = request.headers.get("x-forwarded-for") || "";
  const primera = reenviada.split(",")[0]?.trim();
  return primera || request.headers.get("x-real-ip") || "desconocida";
}

function limpiarRegistrosAntiguos(ahora) {
  if (registros.size < 5000) return;
  for (const [clave, registro] of registros.entries()) {
    if (ahora - registro.inicio > LIMPIEZA_MS) registros.delete(clave);
  }
}

export function claveIp(request) {
  return `ip:${obtenerIp(request)}`;
}

export function limitar(clave, maximo, ventanaMs) {
  const ahora = Date.now();
  const actual = registros.get(clave);

  if (!actual || ahora - actual.inicio >= ventanaMs) {
    registros.set(clave, { inicio: ahora, cuenta: 1, ventanaMs });
    limpiarRegistrosAntiguos(ahora);
    return { permitido: true, reinicio: ahora + ventanaMs };
  }

  actual.cuenta += 1;
  if (actual.cuenta > maximo) {
    return { permitido: false, reinicio: actual.inicio + ventanaMs };
  }
  return { permitido: true, reinicio: actual.inicio + ventanaMs };
}

export function reiniciarLimite(clave) {
  registros.delete(clave);
}

export function segundosParaReintentar(resultado) {
  return Math.max(1, Math.ceil((resultado.reinicio - Date.now()) / 1000));
}
