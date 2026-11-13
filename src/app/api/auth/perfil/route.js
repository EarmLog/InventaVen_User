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
import {
  componerNombreNegocio,
  esSufijoLegalValido,
  esTipoCuentaValido,
  limpiarRif,
  limpiarTelefono,
  separarNombreSufijo,
  validarNombreCuenta,
  validarRifVe,
  validarTelefonoVe,
} from "@/lib/seguridad/validaciones";

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
  const { sufijo } = separarNombreSufijo(perfil.nombre_negocio);
  return {
    id: perfil.id,
    correo: perfil.correo,
    nombreNegocio: perfil.nombre_negocio,
    telefono: perfil.telefono || "",
    tipoCuenta: perfil.tipo_cuenta || "personal",
    negocioRegistrado: Boolean(perfil.negocio_registrado),
    sufijoLegal: perfil.sufijo_legal || sufijo || "",
    rif: perfil.rif || "",
    rol: perfil.rol,
    fechaVencimiento: perfil.fecha_vencimiento,
    ultimoAcceso: perfil.ultimo_acceso,
    creadoEn: perfil.creado_en,
    diasLicencia: Math.max(0, calcularDiasRestantes(perfil.fecha_vencimiento)),
  };
}

function perfilDesdeMetadatos(usuario) {
  const metadatos = usuario.user_metadata || {};
  const nombreCompleto =
    limpiarTexto(metadatos.nombre_negocio, 160) ||
    limpiarTexto(metadatos.nombre, 160) ||
    String(usuario.email || "Mi negocio").split("@")[0];
  const { sufijo } = separarNombreSufijo(nombreCompleto);
  const tipoCuenta = esTipoCuentaValido(metadatos.tipo_cuenta)
    ? metadatos.tipo_cuenta
    : "personal";
  const sufijoLegal = esSufijoLegalValido(metadatos.sufijo_legal)
    ? metadatos.sufijo_legal
    : sufijo;
  return {
    id: usuario.id,
    correo: usuario.email,
    nombre_negocio: nombreCompleto,
    telefono: limpiarTelefono(metadatos.telefono) || null,
    tipo_cuenta: tipoCuenta,
    negocio_registrado:
      Boolean(metadatos.negocio_registrado) ||
      Boolean(metadatos.rif) ||
      Boolean(sufijoLegal),
    sufijo_legal: sufijoLegal || null,
    rif: limpiarRif(metadatos.rif) || null,
    rol: "usuario",
    fecha_vencimiento: sumarDias(new Date(), 30).toISOString(),
    ultimo_acceso: new Date().toISOString(),
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
      const nuevoPerfil = perfilDesdeMetadatos(usuario);
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
    const metadatos = usuario.user_metadata || {};

    const { data: perfilActual, error: errorPerfil } = await cliente
      .from("perfiles")
      .select("*")
      .eq("id", usuario.id)
      .maybeSingle();
    if (errorPerfil) throw errorPerfil;

    const base = perfilActual || perfilDesdeMetadatos(usuario);
    const { nombre: nombreBaseActual, sufijo: sufijoActual } =
      separarNombreSufijo(base.nombre_negocio);

    const tieneNombre = Object.prototype.hasOwnProperty.call(cuerpo, "nombreNegocio");
    const tieneTelefono = Object.prototype.hasOwnProperty.call(cuerpo, "telefono");
    const tieneRif = Object.prototype.hasOwnProperty.call(cuerpo, "rif");
    const tieneTipo = Object.prototype.hasOwnProperty.call(cuerpo, "tipoCuenta");
    const tieneRegistrado = Object.prototype.hasOwnProperty.call(
      cuerpo,
      "negocioRegistrado"
    );
    const tieneSufijo = Object.prototype.hasOwnProperty.call(cuerpo, "sufijoLegal");
    const tieneOnboarding = Object.prototype.hasOwnProperty.call(
      cuerpo,
      "onboardingVisto"
    );

    let nombreBase = tieneNombre
      ? String(cuerpo.nombreNegocio ?? "")
      : nombreBaseActual;
    let tipoCuenta = tieneTipo
      ? String(cuerpo.tipoCuenta ?? "")
      : base.tipo_cuenta || "personal";
    let negocioRegistrado = tieneRegistrado
      ? Boolean(cuerpo.negocioRegistrado)
      : Boolean(base.negocio_registrado);
    let sufijoLegal = tieneSufijo
      ? String(cuerpo.sufijoLegal ?? "")
      : base.sufijo_legal || sufijoActual || "";
    let telefono = tieneTelefono
      ? limpiarTelefono(cuerpo.telefono)
      : limpiarTelefono(base.telefono);
    let rif = tieneRif ? limpiarRif(cuerpo.rif) : limpiarRif(base.rif);

    if (tieneNombre || tieneTipo || tieneRegistrado || tieneSufijo) {
      const errorNombre = validarNombreCuenta(nombreBase);
      if (errorNombre) {
        return NextResponse.json({ error: errorNombre }, { status: 400 });
      }
      if (!esTipoCuentaValido(tipoCuenta)) {
        return NextResponse.json(
          { error: "El tipo de cuenta no es válido." },
          { status: 400 }
        );
      }
      if (tipoCuenta === "empresa") negocioRegistrado = true;
      if (tipoCuenta === "personal") {
        negocioRegistrado = false;
        sufijoLegal = "";
        rif = "";
      }
      if (negocioRegistrado && tipoCuenta !== "personal") {
        if (!sufijoLegal || !esSufijoLegalValido(sufijoLegal)) {
          return NextResponse.json(
            { error: "Selecciona un sufijo legal válido para el negocio." },
            { status: 400 }
          );
        }
      } else {
        sufijoLegal = "";
      }
      nombreBase = limpiarTexto(nombreBase, 160);
    }

    if (tieneTelefono) {
      const errorTelefono = validarTelefonoVe(telefono);
      if (errorTelefono) {
        return NextResponse.json({ error: errorTelefono }, { status: 400 });
      }
    }

    if (tieneRif) {
      const errorRif = validarRifVe(rif);
      if (errorRif) {
        return NextResponse.json({ error: errorRif }, { status: 400 });
      }
    }

    const nombreCompleto = componerNombreNegocio(
      nombreBase || base.nombre_negocio,
      sufijoLegal
    );

    const actualizaciones = {};
    if (tieneNombre || tieneTipo || tieneRegistrado || tieneSufijo) {
      actualizaciones.nombre_negocio = nombreCompleto;
      actualizaciones.tipo_cuenta = tipoCuenta;
      actualizaciones.negocio_registrado = negocioRegistrado;
      actualizaciones.sufijo_legal = sufijoLegal || null;
    }
    if (tieneTelefono) actualizaciones.telefono = telefono || null;
    if (tieneRif) actualizaciones.rif = rif || null;
    if (
      tipoCuenta === "personal" &&
      (tieneNombre || tieneTipo || tieneRegistrado || tieneSufijo)
    ) {
      actualizaciones.rif = null;
    }

    let perfilActualizado = base;
    if (perfilActual) {
      if (Object.keys(actualizaciones).length > 0) {
        const { data, error: errorUpdate } = await cliente
          .from("perfiles")
          .update(actualizaciones)
          .eq("id", usuario.id)
          .select("*")
          .single();
        if (errorUpdate) throw errorUpdate;
        perfilActualizado = data;
      }
    } else {
      const nuevoPerfil = {
        ...base,
        ...actualizaciones,
        correo: usuario.email || base.correo,
        fecha_vencimiento: base.fecha_vencimiento || sumarDias(new Date(), 30).toISOString(),
        ultimo_acceso: new Date().toISOString(),
      };
      const { data, error: errorInsert } = await cliente
        .from("perfiles")
        .insert(nuevoPerfil)
        .select("*")
        .single();
      if (errorInsert) throw errorInsert;
      perfilActualizado = data;
    }

    const metadatosActualizados = {
      ...metadatos,
      nombre_negocio: nombreCompleto,
      nombre: nombreCompleto,
      telefono: telefono || "",
      tipo_cuenta: tipoCuenta,
      negocio_registrado: negocioRegistrado,
      sufijo_legal: sufijoLegal || "",
      rif: rif || "",
    };
    if (tieneOnboarding) {
      metadatosActualizados.onboardingVisto = Boolean(cuerpo.onboardingVisto);
    }

    try {
      const { error: errorMetadata } = await cliente.auth.admin.updateUserById(
        usuario.id,
        { user_metadata: metadatosActualizados }
      );
      if (errorMetadata) {
        console.error(
          "No se pudo actualizar la metadata del usuario:",
          errorMetadata.message
        );
      }
    } catch (errorMetadata) {
      console.error(
        "No se pudo actualizar la metadata del usuario:",
        errorMetadata?.message
      );
    }

    return NextResponse.json({ perfil: normalizarPerfil(perfilActualizado) });
  } catch (error) {
    return NextResponse.json(
      { error: "No se pudo actualizar el perfil.", detalle: error.message },
      { status: 500 }
    );
  }
}
