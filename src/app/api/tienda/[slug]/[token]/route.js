import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { permitirSolicitudPublica } from "@/lib/seguridad/limitePublico";
import { variantesSeguras } from "@/lib/tiendaPublica";

export const dynamic = "force-dynamic";

const CABECERAS_PUBLICAS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};

function noEncontrado() {
  return NextResponse.json(
    { error: "Tienda no encontrada." },
    { status: 404, headers: CABECERAS_PUBLICAS }
  );
}

export async function GET(request, { params }) {
  if (!permitirSolicitudPublica(request, 60, 60 * 1000)) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo en un momento." },
      {
        status: 429,
        headers: { ...CABECERAS_PUBLICAS, "Retry-After": "60" },
      }
    );
  }

  try {
    const { slug, token } = await params;
    if (!/^[a-z0-9-]{1,60}$/.test(String(slug || ""))) return noEncontrado();
    if (!/^[0-9a-f]{48}$/.test(String(token || "").toLowerCase())) {
      return noEncontrado();
    }

    const cliente = crearClienteServidor();
    const { data: tienda, error: errorTienda } = await cliente
      .from("tiendas_publicas")
      .select(
        "usuario_id, nombre_negocio, telefono, telegram, instagram, correo_contacto, horario, tasa_publicada, actualizado_en"
      )
      .eq("slug", slug)
      .eq("token", token.toLowerCase())
      .eq("activo", true)
      .maybeSingle();
    if (errorTienda) throw errorTienda;
    if (!tienda) return noEncontrado();

    const { data: productos, error: errorProductos } = await cliente
      .from("catalogo_productos")
      .select(
        "producto_id, nombre, descripcion, categoria, precio_usd, precio_ves, imagen_token, sku, stock, variantes"
      )
      .eq("tienda_id", tienda.usuario_id)
      .eq("activo", true)
      .order("orden", { ascending: true })
      .order("nombre", { ascending: true });
    if (errorProductos) throw errorProductos;

    return NextResponse.json(
      {
        nombreNegocio: tienda.nombre_negocio || "",
        telefono: tienda.telefono || "",
        telegram: tienda.telegram || "",
        instagram: tienda.instagram || "",
        correoContacto: tienda.correo_contacto || "",
        horario: tienda.horario || "",
        tasa: Number(tienda.tasa_publicada) || 0,
        publicadaEn: tienda.actualizado_en,
        productos: (productos || []).map((producto) => {
          const imagenToken = /^[0-9a-f]{48}$/i.test(String(producto.imagen_token || ""))
            ? String(producto.imagen_token).toLowerCase()
            : "";
          return {
            id: producto.producto_id,
            nombre: producto.nombre || "",
            descripcion: producto.descripcion || "",
            categoria: producto.categoria || "",
            precioUsd: Number(producto.precio_usd) || 0,
            precioVes: Number(producto.precio_ves) || 0,
            imagenUrl: imagenToken ? `/api/imagenes/ver/${imagenToken}` : "",
            sku: producto.sku || "",
            stock: Number(producto.stock) || 0,
            variantes: variantesSeguras(producto.variantes),
          };
        }),
      },
      { headers: CABECERAS_PUBLICAS }
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudo cargar la tienda." },
      { status: 500, headers: CABECERAS_PUBLICAS }
    );
  }
}
