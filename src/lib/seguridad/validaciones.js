import {
  SUFIJOS_LEGALES_VE,
  TIPOS_CUENTA,
} from "@/lib/utilidades/constantes";

export function tieneEspacios(valor) {
  return /\s/.test(String(valor ?? ""));
}

export function sinEspacios(valor) {
  return String(valor ?? "").replace(/\s+/g, "");
}

export function normalizarCorreo(valor) {
  return sinEspacios(valor).toLowerCase();
}

export function validarCorreo(valor) {
  const correo = normalizarCorreo(valor);
  if (!correo) return "Escribe un correo electrónico.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
    return "El correo electrónico no es válido.";
  }
  return "";
}

export function limpiarTelefono(valor) {
  return String(valor ?? "").replace(/\D/g, "").slice(0, 13);
}

export function validarTelefonoVe(valor, { obligatorio = false } = {}) {
  const telefono = limpiarTelefono(valor);
  if (!telefono) {
    return obligatorio ? "Escribe un número de teléfono." : "";
  }
  if (telefono.length < 10 || telefono.length > 13) {
    return "El teléfono debe tener entre 10 y 13 dígitos (ej. 04121234567).";
  }
  return "";
}

export function limpiarRif(valor) {
  const texto = String(valor ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
  if (!texto) return "";
  const letra = texto.slice(0, 1);
  const numeros = texto.slice(1);
  if (!numeros) return letra;
  if (numeros.length <= 8) return `${letra}-${numeros}`;
  return `${letra}-${numeros.slice(0, 8)}-${numeros.slice(8)}`;
}

export function validarRifVe(valor, { obligatorio = false } = {}) {
  const rif = limpiarRif(valor);
  if (!rif) {
    return obligatorio ? "Escribe el RIF del negocio." : "";
  }
  if (!/^[JGVEP]-\d{8}-\d$/.test(rif)) {
    return "El RIF debe tener el formato J-12345678-9.";
  }
  return "";
}

export function validarNombreCuenta(valor) {
  const nombre = String(valor ?? "").trim().replace(/\s+/g, " ");
  if (!nombre) return "Escribe el nombre del negocio o de la cuenta.";
  if (nombre.length < 2) return "El nombre debe tener al menos 2 caracteres.";
  if (nombre.length > 160) return "El nombre no puede superar los 160 caracteres.";
  return "";
}

export function esTipoCuentaValido(valor) {
  return TIPOS_CUENTA.some((tipo) => tipo.valor === valor);
}

export function esSufijoLegalValido(valor) {
  return SUFIJOS_LEGALES_VE.some((sufijo) => sufijo.valor === valor);
}

function escaparExpresion(valor) {
  return String(valor).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function separarNombreSufijo(nombreCompleto) {
  const texto = String(nombreCompleto ?? "").trim().replace(/\s+/g, " ");
  if (!texto) return { nombre: "", sufijo: "" };
  for (const sufijo of SUFIJOS_LEGALES_VE) {
    const patron = new RegExp(
      `\\s*${escaparExpresion(sufijo.valor)}\\s*$`,
      "i"
    );
    if (patron.test(texto)) {
      return {
        nombre: texto.replace(patron, "").trim().replace(/\s+/g, " "),
        sufijo: sufijo.valor,
      };
    }
  }
  return { nombre: texto, sufijo: "" };
}

export function componerNombreNegocio(nombreBase, sufijoLegal) {
  const { nombre } = separarNombreSufijo(nombreBase);
  const sufijo = esSufijoLegalValido(sufijoLegal) ? sufijoLegal : "";
  return sufijo ? `${nombre} ${sufijo}`.trim() : nombre;
}
