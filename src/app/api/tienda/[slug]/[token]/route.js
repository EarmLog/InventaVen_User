import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { variantesSeguras } from "@/lib/tiendaPublica";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const { slug, token } = await params;
    if (!slug || !token) {
      return NextResponse.json({ error: "Tienda no encontrada." }, { status: 404 });
    }

    const cliente = crearClienteServidor();
    const { data: tienda, error: errorTienda } = await cliente
      .from("tiendas_publicas")
      .select(
        "usuario_id, nombre_negocio, telefono, telegram, instagram, correo_contacto, horario, tasa_publicada, actualizado_en"
      )
      .eq("slug", slug)
      .eq("token", token)
      .eq("activo", true)
      .maybeSingle();
    if (errorTienda) throw errorTienda;
    if (!tienda) {
      return NextResponse.json({ error: "Tienda no encontrada." }, { status: 404 });
    }

    const { data: productos, error: errorProductos } = await cliente
      .from("catalogo_productos")
      .select(
        "producto_id, nombre, descripcion, categoria, precio_usd, precio_ves, imagen_url, sku, stock, variantes"
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
        productos: (productos || []).map((producto) => ({
          id: producto.producto_id,
          nombre: producto.nombre || "",
          descripcion: producto.descripcion || "",
          categoria: producto.categoria || "",
          precioUsd: Number(producto.precio_usd) || 0,
          precioVes: Number(producto.precio_ves) || 0,
          imagenUrl: producto.imagen_url || "",
          sku: producto.sku || "",
          stock: Number(producto.stock) || 0,
          variantes: variantesSeguras(producto.variantes),
        })),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "No se pudo cargar la tienda.", detalle: error?.message },
      { status: 500 }
    );
  }
}
