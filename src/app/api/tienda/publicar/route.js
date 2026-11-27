import { NextResponse } from "next/server";
import { crearClienteServidor, extraerToken } from "@/lib/supabase/servidor";
import { generarToken, urlTienda, validarPayloadCatalogo } from "@/lib/tiendaPublica";

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

function imagenABytes(valor) {
  let base64 = valor.replace(/=+$/, "");
  while (base64.length % 4 !== 0) base64 += "=";
  if (typeof atob === "function") {
    const binario = atob(base64);
    const bytes = new Uint8Array(binario.length);
    for (let indice = 0; indice < binario.length; indice += 1) {
      bytes[indice] = binario.charCodeAt(indice);
    }
    return bytes;
  }
  return new Uint8Array(globalThis.Buffer.from(base64, "base64"));
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

    const bucket = cliente.storage.from("catalogo-productos");
    for (const producto of datos.productos) {
      if (!producto.imagenBase64) continue;
      const ruta = `${usuario.id}/${producto.id}.jpg`;
      const { error: errorImagen } = await bucket.upload(ruta, imagenABytes(producto.imagenBase64), {
        upsert: true,
        contentType: "image/jpeg",
      });
      if (errorImagen) {
        throw new Error(`No se pudo subir la imagen de ${producto.nombre}.`);
      }
    }

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
        imagen_url: producto.imagenBase64
          ? bucket.getPublicUrl(`${usuario.id}/${producto.id}.jpg`).data.publicUrl
          : null,
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
