import { NextResponse } from "next/server";
import { crearClienteServidor, extraerToken } from "@/lib/supabase/servidor";
import { generarToken, normalizarSlug, urlTienda } from "@/lib/tiendaPublica";

export const dynamic = "force-dynamic";

function errorSeguro(error, mensaje) {
  const estado = error?.code === "23505" ? 409 : 500;
  return NextResponse.json(
    {
      error:
        estado === 409
          ? "Ese enlace ya está en uso. Prueba con otro nombre."
          : mensaje,
    },
    { status: estado }
  );
}

async function autenticar(request, cliente) {
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
    const { usuario, error, estado } = await autenticar(request, cliente);
    if (error) return NextResponse.json({ error }, { status: estado });

    const { data: tienda, error: errorConsulta } = await cliente
      .from("tiendas_publicas")
      .select("slug, token, activo, telefono, nombre_negocio, actualizado_en")
      .eq("usuario_id", usuario.id)
      .maybeSingle();
    if (errorConsulta) throw errorConsulta;

    return NextResponse.json({
      enlace: tienda
        ? {
            slug: tienda.slug,
            token: tienda.token,
            activo: Boolean(tienda.activo),
            telefono: tienda.telefono || "",
            nombreNegocio: tienda.nombre_negocio || "",
            actualizadoEn: tienda.actualizado_en,
            url: urlTienda(tienda.slug, tienda.token),
          }
        : null,
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo cargar el enlace de la tienda." },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const cliente = crearClienteServidor();
    const { usuario, error, estado } = await autenticar(request, cliente);
    if (error) return NextResponse.json({ error }, { status: estado });

    const cuerpo = await request.json().catch(() => ({}));
    if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
      return NextResponse.json(
        { error: "Los datos del enlace no son válidos." },
        { status: 400 }
      );
    }

    const slug = normalizarSlug(cuerpo.slug);
    if (cuerpo.slug !== undefined && !slug) {
      return NextResponse.json(
        { error: "El enlace debe tener letras o números." },
        { status: 400 }
      );
    }
    const rotarToken = Boolean(cuerpo.rotarToken);
    if (!slug && !rotarToken) {
      return NextResponse.json({ error: "No hay cambios para aplicar." }, { status: 400 });
    }

    const { data: tienda, error: errorConsulta } = await cliente
      .from("tiendas_publicas")
      .select("slug, token, activo, telefono, nombre_negocio")
      .eq("usuario_id", usuario.id)
      .maybeSingle();
    if (errorConsulta) throw errorConsulta;

    const slugFinal = slug || tienda?.slug;
    if (!slugFinal) {
      return NextResponse.json(
        { error: "Primero publica la tienda para configurar el enlace." },
        { status: 404 }
      );
    }
    const token = rotarToken || !tienda ? generarToken() : tienda.token;
    const publicadaEn = new Date().toISOString();

    const { error: errorGuardado } = await cliente
      .from("tiendas_publicas")
      .upsert(
        {
          usuario_id: usuario.id,
          slug: slugFinal,
          token,
          activo: true,
          telefono: tienda?.telefono || null,
          nombre_negocio: tienda?.nombre_negocio || null,
          actualizado_en: publicadaEn,
        },
        { onConflict: "usuario_id" }
      );
    if (errorGuardado) throw errorGuardado;

    return NextResponse.json({
      slug: slugFinal,
      token,
      url: urlTienda(slugFinal, token),
      publicadaEn,
      rotado: rotarToken || !tienda,
    });
  } catch (error) {
    return errorSeguro(error, "No se pudo guardar el enlace de la tienda.");
  }
}
