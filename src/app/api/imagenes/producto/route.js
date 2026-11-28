import { NextResponse } from "next/server";
import { crearClienteServidor, extraerToken } from "@/lib/supabase/servidor";
import { generarToken } from "@/lib/tiendaPublica";

export const dynamic = "force-dynamic";

const BUCKET = "catalogo-productos";
const MIME_PERMITIDOS = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const EXTENSIONES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorSeguro(mensaje, estado = 400) {
  return NextResponse.json({ error: mensaje }, { status: estado });
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

function decodificarImagen(valor) {
  const texto = String(valor || "").trim();
  const coincidencia = texto.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  const mime = coincidencia?.[1] || "image/jpeg";
  const base64 = coincidencia?.[2] || texto;
  if (!MIME_PERMITIDOS.has(mime)) {
    throw new Error("Formato de imagen no permitido. Usa JPG, PNG, WEBP o GIF.");
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new Error("La imagen enviada no es válida.");
  }
  const bytes = Buffer.from(base64, "base64");
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) {
    throw new Error("La imagen debe pesar menos de 5 MB.");
  }
  return { bytes, mime };
}

export async function POST(request) {
  try {
    const cliente = crearClienteServidor();
    const { usuario, error, estado } = await autenticar(request, cliente);
    if (error) return errorSeguro(error, estado);

    const cuerpo = await request.json().catch(() => null);
    if (!cuerpo || !UUID.test(String(cuerpo.productoId || ""))) {
      return errorSeguro("El producto no es válido.");
    }
    const { bytes, mime } = decodificarImagen(cuerpo.imagenBase64);
    const productoId = String(cuerpo.productoId);

    const { data: anterior } = await cliente
      .from("imagenes_producto")
      .select("ruta")
      .eq("producto_id", productoId)
      .eq("usuario_id", usuario.id)
      .maybeSingle();
    if (anterior?.ruta && anterior.ruta !== `${usuario.id}/${productoId}.${EXTENSIONES[mime]}`) {
      await cliente.storage.from(BUCKET).remove([anterior.ruta]);
    }

    const ruta = `${usuario.id}/${productoId}.${EXTENSIONES[mime]}`;
    const { error: errorSubida } = await cliente.storage
      .from(BUCKET)
      .upload(ruta, bytes, {
        contentType: mime,
        upsert: true,
        cacheControl: "300",
      });
    if (errorSubida) throw errorSubida;

    const token = generarToken();
    const { error: errorGuardado } = await cliente
      .from("imagenes_producto")
      .upsert(
        {
          producto_id: productoId,
          usuario_id: usuario.id,
          ruta,
          token,
          content_type: mime,
          actualizado_en: new Date().toISOString(),
        },
        { onConflict: "producto_id" }
      );
    if (errorGuardado) throw errorGuardado;

    return NextResponse.json({
      token,
      url: `/api/imagenes/ver/${token}`,
    });
  } catch (error) {
    return errorSeguro(error?.message || "No se pudo guardar la imagen.", 500);
  }
}

export async function DELETE(request) {
  try {
    const cliente = crearClienteServidor();
    const { usuario, error, estado } = await autenticar(request, cliente);
    if (error) return errorSeguro(error, estado);

    const cuerpo = await request.json().catch(() => null);
    if (!cuerpo || !UUID.test(String(cuerpo.productoId || ""))) {
      return errorSeguro("El producto no es válido.");
    }
    const productoId = String(cuerpo.productoId);
    const { data: fila } = await cliente
      .from("imagenes_producto")
      .select("ruta")
      .eq("producto_id", productoId)
      .eq("usuario_id", usuario.id)
      .maybeSingle();
    if (fila?.ruta) {
      await cliente.storage.from(BUCKET).remove([fila.ruta]);
    }
    const { error: errorBorrado } = await cliente
      .from("imagenes_producto")
      .delete()
      .eq("producto_id", productoId)
      .eq("usuario_id", usuario.id);
    if (errorBorrado) throw errorBorrado;

    return NextResponse.json({ ok: true });
  } catch {
    return errorSeguro("No se pudo eliminar la imagen.", 500);
  }
}
