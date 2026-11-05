import { NextResponse } from "next/server";
import {
  crearClienteServidor,
  extraerToken,
} from "@/lib/supabase/servidor";
import {
  calcularDiasRestantes,
  limpiarTexto,
  sumarDias,
} from "@/lib/utilidades/formato";

export const dynamic = "force-dynamic";

async function obtenerUsuario(request, cliente) {
  const token = extraerToken(request);
  if (!token) return { error: "No hay una sesión activa.", estado: 401 };
  const { data, error } = await cliente.auth.getUser(token);
  if (error || !data?.user) {
    return { error: "La sesión no es válida o expiró.", estado: 401 };
  }
  return { usuario: data.user };
}

function normalizarPerfil(perfil) {
  return {
    id: perfil.id,
    correo: perfil.correo,
    nombreNegocio: perfil.nombre_negocio,
    telefono: perfil.telefono || "",
    rif: perfil.rif || perfil.rif_negocio || "",
    rol: perfil.rol,
    fechaVencimiento: perfil.fecha_vencimiento,
    ultimoAcceso: perfil.ultimo_acceso,
    creadoEn: perfil.creado_en,
    diasLicencia: Math.max(0, calcularDiasRestantes(perfil.fecha_vencimiento)),
  };
}

export async function GET(request) {
  try {
    const cliente = crearClienteServidor();
    const { usuario, error, estado } = await obtenerUsuario(request, cliente);
    if (error) return NextResponse.json({ error }, { status: estado });

    let { data: perfil, error: errorPerfil } = await cliente
      .from("perfiles")
      .select("*")
      .eq("id", usuario.id)
      .maybeSingle();

    if (errorPerfil) throw errorPerfil;

    if (!perfil) {
      const metadatos = usuario.user_metadata || {};
      const nuevoPerfil = {
        id: usuario.id,
        correo: usuario.email,
        nombre_negocio:
          limpiarTexto(metadatos.nombre_negocio, 160) ||
          limpiarTexto(metadatos.nombre, 160) ||
          String(usuario.email || "Mi negocio").split("@")[0],
        telefono: limpiarTexto(metadatos.telefono, 40) || null,
        rol: "usuario",
        fecha_vencimiento: sumarDias(new Date(), 30).toISOString(),
        ultimo_acceso: new Date().toISOString(),
      };
      const { data: creado, error: errorCreacion } = await cliente
        .from("perfiles")
        .insert(nuevoPerfil)
        .select("*")
        .single();
      if (errorCreacion) throw errorCreacion;
      perfil = creado;
    } else {
      const { data: actualizado, error: errorActualizacion } = await cliente
        .from("perfiles")
        .update({ ultimo_acceso: new Date().toISOString() })
        .eq("id", usuario.id)
        .select("*")
        .single();
      if (errorActualizacion) throw errorActualizacion;
      perfil = actualizado;
    }

    return NextResponse.json({ perfil: normalizarPerfil(perfil) });
  } catch (error) {
    return NextResponse.json(
      { error: "No se pudo cargar el perfil.", detalle: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const cliente = crearClienteServidor();
    const { usuario, error, estado } = await obtenerUsuario(request, cliente);
    if (error) return NextResponse.json({ error }, { status: estado });

    const cuerpo = await request.json();
    const nombreNegocio = limpiarTexto(cuerpo.nombreNegocio, 160);
    const telefono = limpiarTexto(cuerpo.telefono, 40);
    const rif = limpiarTexto(cuerpo.rif, 20);
    if (!nombreNegocio) {
      return NextResponse.json(
        { error: "El nombre del negocio es obligatorio." },
        { status: 400 }
      );
    }

    const { data: perfil, error: errorPerfil } = await cliente
      .from("perfiles")
      .update({
        nombre_negocio: nombreNegocio,
        telefono: telefono || null,
        rif: rif || null,
      })
      .eq("id", usuario.id)
      .select("*")
      .single();
    if (errorPerfil) throw errorPerfil;

    const metadatosActualizados = {
      ...(usuario.user_metadata || {}),
      nombre_negocio: nombreNegocio,
      telefono,
    };
    if (rif) metadatosActualizados.rif = rif;

    await cliente.auth.admin.updateUserById(usuario.id, {
      user_metadata: metadatosActualizados,
    });

    return NextResponse.json({ perfil: normalizarPerfil(perfil) });
  } catch (error) {
    return NextResponse.json(
      { error: "No se pudo actualizar el perfil.", detalle: error.message },
      { status: 500 }
    );
  }
}
