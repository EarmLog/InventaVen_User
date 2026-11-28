import { NextResponse } from "next/server";
import { crearClienteServidor, extraerToken } from "@/lib/supabase/servidor";
import {
  CLAVES_AJUSTES,
  CLAVES_CONFIGURACION_NUBE,
  CONFIGURACION_NUBE_POR_DEFECTO,
} from "@/lib/utilidades/constantes";

export const dynamic = "force-dynamic";

const TIPOS_CONFIGURACION = {
  [CLAVES_AJUSTES.TEMA]: "texto",
  [CLAVES_AJUSTES.ACTUALIZAR_PRECIOS_AUTO]: "booleano",
  [CLAVES_AJUSTES.TASA_USD]: "numero",
  [CLAVES_AJUSTES.TASA_ACTUALIZADA_EN]: "texto",
  [CLAVES_AJUSTES.ULTIMA_ACTUALIZACION_PRECIOS]: "texto",
  [CLAVES_AJUSTES.TASA_ULTIMA_APLICADA]: "numero",
  [CLAVES_AJUSTES.TASA_MANUAL]: "booleano",
  [CLAVES_AJUSTES.TASA_MANUAL_VALOR]: "numero",
  [CLAVES_AJUSTES.NOMBRE_NEGOCIO]: "texto",
  [CLAVES_AJUSTES.RIF_NEGOCIO]: "texto",
  [CLAVES_AJUSTES.ONBOARDING_VISTO]: "booleano",
  [CLAVES_AJUSTES.COPIA_NUBE_ACTIVA]: "booleano",
  [CLAVES_AJUSTES.COPIA_NUBE_ULTIMA]: "texto",
  [CLAVES_AJUSTES.COPIA_NUBE_ULTIMA_FECHA]: "texto",
  [CLAVES_AJUSTES.METODO_DEUDA_ACTIVO]: "booleano",
  [CLAVES_AJUSTES.ACTUALIZAR_SALDOS_DEUDOR_DOLAR]: "booleano",
  [CLAVES_AJUSTES.COMISION_CASHEA]: "numero",
  [CLAVES_AJUSTES.TIENDA_SLUG]: "texto",
  [CLAVES_AJUSTES.TIENDA_TOKEN]: "texto",
  [CLAVES_AJUSTES.TIENDA_ACTIVA]: "booleano",
  [CLAVES_AJUSTES.TIENDA_TELEFONO]: "texto",
  [CLAVES_AJUSTES.TIENDA_PUBLICADA_EN]: "texto",
  [CLAVES_AJUSTES.TIENDA_HORARIO]: "texto",
  [CLAVES_AJUSTES.TIENDA_TELEGRAM]: "texto",
  [CLAVES_AJUSTES.TIENDA_INSTAGRAM]: "texto",
  [CLAVES_AJUSTES.TIENDA_CORREO_CONTACTO]: "texto",
};

function sanitizarValor(clave, valor) {
  const tipo = TIPOS_CONFIGURACION[clave];
  if (!tipo) return undefined;
  if (tipo === "booleano") return Boolean(valor);
  if (tipo === "numero") {
    const numero = Number(valor);
    return Number.isFinite(numero) && numero >= 0 ? numero : 0;
  }
  return String(valor ?? "")
    .trim()
    .slice(0, 240);
}

function configuracionSegura(datos) {
  const resultado = { ...CONFIGURACION_NUBE_POR_DEFECTO };
  for (const clave of CLAVES_CONFIGURACION_NUBE) {
    if (Object.prototype.hasOwnProperty.call(datos || {}, clave)) {
      resultado[clave] = sanitizarValor(clave, datos[clave]);
    }
  }
  return resultado;
}

async function obtenerUsuario(request, cliente) {
  const token = extraerToken(request);
  if (!token) return { error: "No hay una sesión activa.", estado: 401 };
  const { data, error } = await cliente.auth.getUser(token);
  if (error || !data?.user) {
    return { error: "La sesión no es válida o expiró.", estado: 401 };
  }
  return { usuario: data.user };
}

export async function GET(request) {
  try {
    const cliente = crearClienteServidor();
    const { usuario, error, estado } = await obtenerUsuario(request, cliente);
    if (error) return NextResponse.json({ error }, { status: estado });

    const { data: fila, error: errorConsulta } = await cliente
      .from("configuraciones_usuario")
      .select("datos")
      .eq("usuario_id", usuario.id)
      .maybeSingle();
    if (errorConsulta) throw errorConsulta;

    return NextResponse.json({
      configuracion: configuracionSegura(fila?.datos),
      existente: Boolean(fila),
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo cargar la configuración." },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const cliente = crearClienteServidor();
    const { usuario, error, estado } = await obtenerUsuario(request, cliente);
    if (error) return NextResponse.json({ error }, { status: estado });

    const cuerpo = await request.json().catch(() => null);
    if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
      return NextResponse.json(
        { error: "La configuración enviada no es válida." },
        { status: 400 }
      );
    }

    const cambios = {};
    for (const clave of CLAVES_CONFIGURACION_NUBE) {
      if (!Object.prototype.hasOwnProperty.call(cuerpo, clave)) continue;
      const valor = sanitizarValor(clave, cuerpo[clave]);
      if (valor !== undefined) cambios[clave] = valor;
    }
    if (!Object.keys(cambios).length) {
      return NextResponse.json({ error: "No hay cambios válidos." }, { status: 400 });
    }

    const { data: fila, error: errorConsulta } = await cliente
      .from("configuraciones_usuario")
      .select("datos")
      .eq("usuario_id", usuario.id)
      .maybeSingle();
    if (errorConsulta) throw errorConsulta;

    const configuracion = configuracionSegura({ ...(fila?.datos || {}), ...cambios });
    const { error: errorGuardado } = await cliente
      .from("configuraciones_usuario")
      .upsert(
        {
          usuario_id: usuario.id,
          datos: configuracion,
          actualizado_en: new Date().toISOString(),
        },
        { onConflict: "usuario_id" }
      );
    if (errorGuardado) throw errorGuardado;

    return NextResponse.json({ configuracion });
  } catch {
    return NextResponse.json(
      { error: "No se pudo guardar la configuración." },
      { status: 500 }
    );
  }
}
