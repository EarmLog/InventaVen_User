import { NextResponse } from "next/server";
import { crearClienteServidor, extraerToken } from "@/lib/supabase/servidor";
import { generarToken, urlTienda, validarPayloadCatalogo } from "@/lib/tiendaPublica";

export const dynamic = "force-dynamic";

function respuestaError(error, mensaje) {
  const estado = error?.code === "23505" ? 409 : 500;
  return NextResponse.json(
    {
      error:
        estado === 409
          ? "El enlace de la tienda ya está en uso."
          : mensaje,
    },
    { status: estado }
  );
}

export async function POST(request) {
  try {
    const cliente = crearClienteServidor();
    const tokenSesion = extraerToken(request);
    if (!tokenSesion) {
      return NextResponse.json({ error: "No hay una sesión activa." }, { status: 401 });
    }

    const { data: autenticacion, error: errorAuth } = await cliente.auth.getUser(tokenSesion);
    if (errorAuth || !autenticacion?.user) {
      return NextResponse.json({ error: "La sesión no es válida o expiró." }, { status: 401 });
    }
    const usuario = autenticacion.user;

    let cuerpo;
    try {
      cuerpo = await request.json();
    } catch {
      return NextResponse.json({ error: "El cuerpo de la petición no es válido." }, { status: 400 });
    }

    const { datos, error: errorValidacion } = validarPayloadCatalogo(cuerpo);
    if (errorValidacion) {
      return NextResponse.json({ error: errorValidacion }, { status: 400 });
    }

    const { data: imagenesExistentes, error: errorImagenesExistentes } = await cliente
      .from("catalogo_productos")
      .select("producto_id, imagen_token")
      .eq("tienda_id", usuario.id);
    if (errorImagenesExistentes) throw errorImagenesExistentes;

    const imagenesActuales = new Map(
      (imagenesExistentes || []).map((item) => [item.producto_id, item.imagen_token])
    );

    const { data: tiendaActual, error: errorTiendaActual } = await cliente
      .from("tiendas_publicas")
      .select("token")
      .eq("usuario_id", usuario.id)
      .maybeSingle();
    if (errorTiendaActual) throw errorTiendaActual;

    const slug = datos.slug;
    const token = tiendaActual?.token || generarToken();
    const publicadaEn = new Date().toISOString();

    const { error: errorUpsertTienda } = await cliente.from("tiendas_publicas").upsert(
      {
        usuario_id: usuario.id,
        slug,
        token,
        activo: true,
        telefono: datos.telefono,
        telegram: datos.telegram,
        instagram: datos.instagram,
        correo_contacto: datos.correoContacto,
        horario: datos.horario,
        tasa_publicada: datos.tasa,
        nombre_negocio: datos.nombreNegocio,
        actualizado_en: publicadaEn,
      },
      { onConflict: "usuario_id" }
    );
    if (errorUpsertTienda) throw errorUpsertTienda;

    const ids = datos.productos.map((producto) => producto.id);
    const { data: anteriores, error: errorAnteriores } = await cliente
      .from("catalogo_productos")
      .select("producto_id")
      .eq("tienda_id", usuario.id);
    if (errorAnteriores) throw errorAnteriores;

    const eliminar = (anteriores || [])
      .filter((item) => !ids.includes(item.producto_id))
      .map((item) => item.producto_id);
    if (eliminar.length > 0) {
      const { error: errorEliminar } = await cliente
        .from("catalogo_productos")
        .delete()
        .eq("tienda_id", usuario.id)
        .in("producto_id", eliminar);
      if (errorEliminar) throw errorEliminar;
    }

    if (datos.productos.length > 0) {
      const filas = datos.productos.map((producto, indice) => ({
        tienda_id: usuario.id,
        producto_id: producto.id,
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        categoria: producto.categoria,
        precio_usd: producto.precioUsd,
        precio_ves: producto.precioVes,
        imagen_token: producto.imagenToken || imagenesActuales.get(producto.id) || null,
        sku: producto.sku,
        stock: producto.stock,
        variantes: producto.variantes,
        orden: indice,
        activo: true,
        actualizado_en: publicadaEn,
      }));

      const { error: errorCatalogo } = await cliente
        .from("catalogo_productos")
        .upsert(filas, { onConflict: "tienda_id,producto_id" });
      if (errorCatalogo) throw errorCatalogo;
    }

    return NextResponse.json({
      slug,
      token,
      url: urlTienda(slug, token),
      publicadaEn,
      productos: datos.productos.length,
    });
  } catch (error) {
    return respuestaError(error, "No se pudo publicar la tienda.");
  }
}
