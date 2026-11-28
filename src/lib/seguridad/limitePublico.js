const solicitudes = new Map();

export function ipPublica(request) {
  const cabecera =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "local";
  return cabecera.split(",")[0].trim().slice(0, 64);
}

export function permitirSolicitudPublica(request, limite = 60, ventanaMs = 60000) {
  const ip = ipPublica(request);
  const ahora = Date.now();
  const registro = solicitudes.get(ip);
  if (!registro || ahora - registro.inicio > ventanaMs) {
    solicitudes.set(ip, { inicio: ahora, cantidad: 1 });
    return true;
  }
  if (registro.cantidad >= limite) return false;
  registro.cantidad += 1;
  return true;
}
