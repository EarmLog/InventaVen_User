import { obtenerClienteSupabase } from "@/lib/supabase/cliente";
import { CLAVES_AJUSTES } from "@/lib/utilidades/constantes";
import { guardarAjustes } from "./repositorios";
import { generarRespaldoZip } from "./respaldo";

export const BUCKET_RESPALDOS = "respaldos";
export const DIAS_RETENCION_NUBE = 14;

function dosDigitos(valor) {
  return String(valor).padStart(2, "0");
}

export function nombreCopiaNube(fecha = new Date()) {
  const anio = fecha.getFullYear();
  const mes = dosDigitos(fecha.getMonth() + 1);
  const dia = dosDigitos(fecha.getDate());
  const hora = dosDigitos(fecha.getHours());
  const minuto = dosDigitos(fecha.getMinutes());
  const segundo = dosDigitos(fecha.getSeconds());
  return `${anio}-${mes}-${dia}_${hora}-${minuto}-${segundo}.zip`;
}

export function fechaLocalClave(fecha = new Date()) {
  const anio = fecha.getFullYear();
  const mes = dosDigitos(fecha.getMonth() + 1);
  const dia = dosDigitos(fecha.getDate());
  return `${anio}-${mes}-${dia}`;
}

export function fechaDesdeNombreCopia(nombre) {
  const coincidencia = String(nombre || "").match(/^(\d{4}-\d{2}-\d{2})_/);
  if (!coincidencia) return null;
  const fecha = new Date(`${coincidencia[1]}T00:00:00`);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function traducirErrorNube(error) {
  const mensaje = String(error?.message || "").toLowerCase();
  if (mensaje.includes("bucket not found")) {
    return "El almacenamiento en la nube no está configurado. Aplica la migración de respaldos.";
  }
  if (mensaje.includes("row-level security") || mensaje.includes("violates row-level")) {
    return "No tienes permiso para guardar esta copia. Verifica tu sesión e intenta de nuevo.";
  }
  if (mensaje.includes("payload too large") || mensaje.includes("maximum allowed size")) {
    return "La copia supera el límite de 50 MB permitido en la nube.";
  }
  if (mensaje.includes("failed to fetch") || mensaje.includes("network")) {
    return "No hay conexión con la nube. La copia se reintentará cuando vuelvas a estar en línea.";
  }
  return error?.message || "No se pudo completar la copia en la nube.";
}

async function obtenerUsuarioNube() {
  const supabase = obtenerClienteSupabase();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(traducirErrorNube(error));
  const usuario = data.session?.user;
  if (!usuario?.id) {
    throw new Error("Inicia sesión para usar las copias en la nube.");
  }
  return { supabase, usuario };
}

export async function listarRespaldosNube() {
  const { supabase, usuario } = await obtenerUsuarioNube();
  const { data, error } = await supabase.storage.from(BUCKET_RESPALDOS).list(usuario.id, {
    limit: 100,
    sortBy: { column: "name", order: "desc" },
  });
  if (error) throw new Error(traducirErrorNube(error));

  return (data || [])
    .filter((archivo) => archivo.name?.toLowerCase().endsWith(".zip"))
    .map((archivo) => ({
      nombre: archivo.name,
      ruta: `${usuario.id}/${archivo.name}`,
      creadoEn: archivo.created_at || null,
      actualizadoEn: archivo.updated_at || null,
      tamano: Number(archivo.metadata?.size || 0),
      fecha: fechaDesdeNombreCopia(archivo.name),
    }))
    .sort((a, b) => {
      const fechaA = a.fecha?.getTime() || 0;
      const fechaB = b.fecha?.getTime() || 0;
      return fechaB - fechaA;
    });
}

export async function subirRespaldoNube({ blob, nombre } = {}) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error("Sin conexión. La copia en la nube se hará cuando vuelvas a internet.");
  }
  const { supabase, usuario } = await obtenerUsuarioNube();
  const respaldo = blob && nombre ? { blob, nombre } : await generarRespaldoZip();
  const ruta = `${usuario.id}/${respaldo.nombre}`;

  const { error } = await supabase.storage
    .from(BUCKET_RESPALDOS)
    .upload(ruta, respaldo.blob, {
      contentType: "application/zip",
      upsert: false,
      cacheControl: "3600",
    });
  if (error) throw new Error(traducirErrorNube(error));

  return {
    nombre: respaldo.nombre,
    ruta,
    tamano: respaldo.blob.size,
  };
}

export async function descargarRespaldoNube(nombre) {
  const { supabase, usuario } = await obtenerUsuarioNube();
  const { data, error } = await supabase.storage
    .from(BUCKET_RESPALDOS)
    .download(`${usuario.id}/${nombre}`);
  if (error) throw new Error(traducirErrorNube(error));
  if (!data) throw new Error("La copia solicitada no está disponible.");
  return data;
}

export async function eliminarRespaldoNube(nombre) {
  const { supabase, usuario } = await obtenerUsuarioNube();
  const { error } = await supabase.storage
    .from(BUCKET_RESPALDOS)
    .remove([`${usuario.id}/${nombre}`]);
  if (error) throw new Error(traducirErrorNube(error));
}

export async function limpiarRespaldosAntiguos(dias = DIAS_RETENCION_NUBE) {
  const respaldos = await listarRespaldosNube();
  const limite = new Date();
  limite.setHours(0, 0, 0, 0);
  limite.setDate(limite.getDate() - dias);

  const antiguos = respaldos.filter((respaldo) => {
    if (!respaldo.fecha) return false;
    return respaldo.fecha.getTime() < limite.getTime();
  });

  if (!antiguos.length) return [];

  const { supabase, usuario } = await obtenerUsuarioNube();
  const { error } = await supabase.storage
    .from(BUCKET_RESPALDOS)
    .remove(antiguos.map((respaldo) => `${usuario.id}/${respaldo.nombre}`));
  if (error) throw new Error(traducirErrorNube(error));

  return antiguos.map((respaldo) => respaldo.nombre);
}

export async function registrarCopiaNubeExitosa(resultado) {
  await guardarAjustes({
    [CLAVES_AJUSTES.COPIA_NUBE_ULTIMA]: resultado?.nombre || "",
    [CLAVES_AJUSTES.COPIA_NUBE_ULTIMA_FECHA]: new Date().toISOString(),
    [CLAVES_AJUSTES.COPIA_NUBE_ULTIMO_ERROR]: "",
  });
}

export async function registrarErrorCopiaNube(error) {
  await guardarAjustes({
    [CLAVES_AJUSTES.COPIA_NUBE_ULTIMO_ERROR]: error?.message || String(error || ""),
  });
}
