import {
  createHmac,
  randomInt,
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
  return String(respuesta ?? "").trim();
}

function calcularHuella(id, respuesta) {
  return createHmac("sha256", obtenerSecreto())
    .update(`captcha:${id}:${normalizarRespuesta(respuesta)}`)
    .digest("base64url");
}

function generarOperacion() {
  const tipo = randomInt(0, 2);

  if (tipo === 0) {
    const a = randomInt(2, 13);
    const b = randomInt(2, 13);
    return { pregunta: `¿Cuánto es ${a} + ${b}?`, respuesta: a + b };
  }

  const a = randomInt(10, 31);
  const b = randomInt(1, a);
  return { pregunta: `¿Cuánto es ${a} - ${b}?`, respuesta: a - b };
}

export function crearDesafio() {
  const id = randomUUID();
  const expiraEn = Date.now() + DURACION_DESAFIO_MS;
  const operacion = generarOperacion();
  const token = codificarCarga({
    tipo: "desafio",
    id,
    expiraEn,
    huella: calcularHuella(id, operacion.respuesta),
  });

  return {
    token,
    pregunta: operacion.pregunta,
    expiraEn: new Date(expiraEn).toISOString(),
    duracionSegundos: Math.floor(DURACION_DESAFIO_MS / 1000),
  };
}

export function validarDesafio(token, respuesta) {
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
    return { valido: false, motivo: "La respuesta de seguridad es incorrecta." };
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
