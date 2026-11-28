import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";

const BUCKET = "catalogo-productos";
const TOKEN = /^[0-9a-f]{48}$/;
const LIMITE = 90;
const VENTANA_MS = 60 * 1000;
const visitas = new Map();

function ipSolicitud(request) {
  const cabecera = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "local";
  return cabecera.split(",")[0].trim().slice(0, 64);
}

function dentroDelLimite(ip) {
  const ahora = Date.now();
  const registro = visitas.get(ip);
  if (!registro || ahora - registro.inicio > VENTANA_MS) {
    visitas.set(ip, { inicio: ahora, cantidad: 1 });
    return true;
  }
  if (registro.cantidad >= LIMITE) return false;
  registro.cantidad += 1;
  return true;
}

function cabecerasSeguras(tipo) {
  return {
    "Content-Type": tipo || "image/jpeg",
    "Cache-Control": "private, max-age=300",
    "Content-Security-Policy": "default-src 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
  };
}

export async function GET(request, { params }) {
  const ip = ipSolicitud(request);
  if (!dentroDelLimite(ip)) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo en un momento." },
      {
        status: 429,
        headers: { "Retry-After": "60", "X-Robots-Tag": "noindex, nofollow" },
      }
    );
  }

  const token = String(params?.token || "").toLowerCase();
  if (!TOKEN.test(token)) {
    return NextResponse.json(
      { error: "Imagen no encontrada." },
      { status: 404, headers: { "X-Robots-Tag": "noindex, nofollow" } }
    );
  }

  try {
    const cliente = crearClienteServidor();
    const { data: fila, error: errorConsulta } = await cliente
      .from("imagenes_producto")
      .select("ruta, content_type")
      .eq("token", token)
      .maybeSingle();
    if (errorConsulta || !fila?.ruta) {
      return NextResponse.json(
        { error: "Imagen no encontrada." },
        { status: 404, headers: { "X-Robots-Tag": "noindex, nofollow" } }
      );
    }

    const { data: archivo, error: errorArchivo } = await cliente.storage
      .from(BUCKET)
      .download(fila.ruta);
    if (errorArchivo || !archivo) {
      return NextResponse.json(
        { error: "Imagen no encontrada." },
        { status: 404, headers: { "X-Robots-Tag": "noindex, nofollow" } }
      );
    }

    const bytes = await archivo.arrayBuffer();
    return new Response(bytes, {
      status: 200,
      headers: cabecerasSeguras(fila.content_type),
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo servir la imagen." },
      { status: 500, headers: { "X-Robots-Tag": "noindex, nofollow" } }
    );
  }
}
