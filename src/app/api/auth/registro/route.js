import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { traducirErrorAuth } from "@/lib/api/auth";
import { limpiarTexto, sumarDias } from "@/lib/utilidades/formato";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const cuerpo = await request.json().catch(() => null);
    const correo =
      typeof cuerpo?.correo === "string"
        ? cuerpo.correo.trim().toLowerCase().slice(0, 254)
        : "";
    const contrasena =
      typeof cuerpo?.contrasena === "string" ? cuerpo.contrasena.slice(0, 200) : "";
    const nombreNegocio = limpiarTexto(cuerpo?.nombreNegocio, 160);
    const telefono = limpiarTexto(cuerpo?.telefono, 40);

    if (!correo.includes("@") || !contrasena || !nombreNegocio) {
      return NextResponse.json(
        { error: "Completa el correo, la contraseña y el nombre del negocio." },
        { status: 400 }
      );
    }

    if (contrasena.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres." },
        { status: 400 }
      );
    }

    const servidor = crearClienteServidor();

    // Crear usuario mediante Admin API (bypassea rate limits de cliente y auto-confirma el correo)
    const { data, error } = await servidor.auth.admin.createUser({
      email: correo,
      password: contrasena,
      email_confirm: true,
      user_metadata: {
        nombre_negocio: nombreNegocio,
        nombre: nombreNegocio,
        telefono: telefono || "",
        onboardingVisto: false,
      },
    });

    if (error) {
      return NextResponse.json(
        { error: traducirErrorAuth(error) },
        { status: 400 }
      );
    }

    const usuarioId = data.user.id;
    const { data: perfilExistente } = await servidor
      .from("perfiles")
      .select("id")
      .eq("id", usuarioId)
      .maybeSingle();

    if (!perfilExistente) {
      await servidor.from("perfiles").insert({
        id: usuarioId,
        correo: correo,
        nombre_negocio: nombreNegocio,
        telefono: telefono || null,
        rol: "usuario",
        fecha_vencimiento: sumarDias(new Date(), 30).toISOString(),
        ultimo_acceso: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { ok: true, mensaje: "Cuenta creada con éxito." },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "No se pudo crear la cuenta. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
