import { NextResponse } from "next/server";
import { crearClienteServidor, extraerToken } from "@/lib/supabase/servidor";
import { generarToken, normalizarSlug, urlTienda } from "@/lib/tiendaPublica";

export const dynamic = "force-dynamic";

function respuestaError(error, mensaje) {
  const estado = error?.code === "23505" ? 409 : 500;
  return NextResponse.json(
    {
      error: estado === 409 ? "El enlace de la tienda ya está en uso." : mensaje,
      detalle: error?.message || String(error),
    },
    { status: estado }
  );
}

export async function POST(request) {
  try {
    const cliente = crearClienteServidor();
    const cuerpoLeido = await request.json().catch(() => ({}));
    const cuerpo =
      cuerpoLeido && typeof cuerpoLeido === "object" && !Array.isArray(cuerpoLeido)
        ? cuerpoLeido
        : {};
    const tokenSesion = extraerToken(request);
    if (!tokenSesion) {
      return NextResponse.json({ error: "No hay una sesión activa." }, { status: 401 });
    }

    const { data: autenticacion, error: errorAuth } = await cliente.auth.getUser(tokenSesion);
    if (errorAuth || !autenticacion?.user) {
      return NextResponse.json({ error: "La sesión no es válida o expiró." }, { status: 401 });
    }
    const usuario = autenticacion.user;

    const { data: tienda, error: errorTienda } = await cliente
      .from("tiendas_publicas")
      .select("slug")
      .eq("usuario_id", usuario.id)
      .maybeSingle();
    if (errorTienda) throw errorTienda;
    if (!tienda) {
      return NextResponse.json({ error: "La tienda todavía no está publicada." }, { status: 404 });
    }

    const slugEnviado = String(cuerpo.slug ?? "").trim();
    let slugFinal = normalizarSlug(cuerpo.slug);
    if (slugEnviado && !slugFinal) {
      return NextResponse.json(
        { error: "El enlace de la tienda no es válido." },
        { status: 400 }
      );
    }
    if (!slugFinal) slugFinal = tienda.slug;

    const token = generarToken();
    const publicadaEn = new Date().toISOString();

    const { error: errorActualizacion } = await cliente
      .from("tiendas_publicas")
      .update({ slug: slugFinal, token, activo: true, actualizado_en: publicadaEn })
      .eq("usuario_id", usuario.id);
    if (errorActualizacion) throw errorActualizacion;

    const { count, error: errorConteo } = await cliente
      .from("catalogo_productos")
      .select("id", { count: "exact", head: true })
      .eq("tienda_id", usuario.id)
      .eq("activo", true);
    if (errorConteo) throw errorConteo;

    return NextResponse.json({
      slug: slugFinal,
      token,
      url: urlTienda(slugFinal, token),
      publicadaEn,
      productos: count || 0,
    });
  } catch (error) {
    return respuestaError(error, "No se pudo renovar el enlace de la tienda.");
  }
}
