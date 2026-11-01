import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

const DURACION_DESAFIO_MS = 5 * 60 * 1000;
const DURACION_TICKET_MS = 2 * 60 * 1000;
const MAXIMO_TICKETS_USADOS = 5000;

const ticketsUsados = new Set();

function obtenerSecreto() {
  const secreto =
    process.env.CAPTCHA_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secreto) {
    throw new Error("No hay una clave configurada para validar el captcha.");
  }
  return `inventaven-captcha:${secreto}`;
}

function firmar(contenido) {
  return createHmac("sha256", obtenerSecreto())
    .update(contenido)
    .digest("base64url");
}

function codificarCarga(carga) {
  const cuerpo = Buffer.from(JSON.stringify(carga)).toString("base64url");
  return `${cuerpo}.${firmar(cuerpo)}`;
}

function decodificarCarga(token) {
  if (typeof token !== "string") return null;
  const [cuerpo, firma] = token.split(".");
  if (!cuerpo || !firma) return null;

  const esperada = Buffer.from(firmar(cuerpo));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length) return null;
  if (!timingSafeEqual(esperada, recibida)) return null;

  try {
    return JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function normalizarRespuesta(respuesta) {
  return String(respuesta ?? "")
    .trim()
    .toUpperCase();
}

function generarCodigoCaptcha() {
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  const codigo = Array.from(bytes, (byte) => caracteres[byte % caracteres.length]).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="64" viewBox="0 0 240 64" role="img" aria-label="Imagen de verificación">
  <rect width="240" height="64" rx="12" fill="#111827" />
  <rect x="2" y="2" width="236" height="60" rx="10" fill="none" stroke="#6b7280" strokeWidth="1.5" />
  <text x="120" y="40" fontFamily="Arial, sans-serif" fontSize="28" fontWeight="700" fill="#ffffff" textAnchor="middle">${codigo}</text>
</svg>`;

  return {
    codigo,
    imagen: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  };
}

function calcularHuella(id, respuesta) {
  return createHmac("sha256", obtenerSecreto())
    .update(`captcha:${id}:${normalizarRespuesta(respuesta)}`)
    .digest("base64url");
}

function crearDesafio() {
  const id = randomUUID();
  const expiraEn = Date.now() + DURACION_DESAFIO_MS;
  const { codigo, imagen } = generarCodigoCaptcha();
  const token = codificarCarga({
    tipo: "desafio",
    id,
    expiraEn,
    huella: calcularHuella(id, codigo),
    respuesta: codigo,
  });

  return {
    token,
    imagen,
    expiraEn: new Date(expiraEn).toISOString(),
    duracionSegundos: Math.floor(DURACION_DESAFIO_MS / 1000),
  };
}

function validarDesafio(token, respuesta) {
  const carga = decodificarCarga(token);
  if (!carga || carga.tipo !== "desafio") {
    return { valido: false, motivo: "La verificación de seguridad no es válida." };
  }

  if (!Number.isFinite(carga.expiraEn) || Date.now() > carga.expiraEn) {
    return { valido: false, motivo: "La verificación de seguridad expiró." };
  }

  const respuestaIngresada = normalizarRespuesta(respuesta);
  const esperada = Buffer.from(calcularHuella(String(carga.id || ""), respuestaIngresada));
  const recibida = Buffer.from(String(carga.huella || ""));
  const coincide =
    esperada.length === recibida.length && timingSafeEqual(esperada, recibida);

  if (!coincide) {
    return { valido: false, motivo: "El código de la imagen no es correcto." };
  }

  const expiraEn = Date.now() + DURACION_TICKET_MS;
  return {
    valido: true,
    ticket: codificarCarga({
      tipo: "ticket",
      id: randomUUID(),
      expiraEn,
    }),
    expiraEn: new Date(expiraEn).toISOString(),
  };
}

export function consumirTicket(ticket) {
  const carga = decodificarCarga(ticket);
  if (!carga || carga.tipo !== "ticket") return false;
  if (!Number.isFinite(carga.expiraEn) || Date.now() > carga.expiraEn) return false;
  if (!carga.id || ticketsUsados.has(carga.id)) return false;

  if (ticketsUsados.size >= MAXIMO_TICKETS_USADOS) {
    ticketsUsados.clear();
  }
  ticketsUsados.add(carga.id);
  return true;
}
