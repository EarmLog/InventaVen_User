import { NextResponse } from "next/server";
import { crearDesafio, validarDesafio } from "@/lib/captcha";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(crearDesafio(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo generar la verificación de seguridad." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const cuerpo = await request.json().catch(() => null);
    const token = typeof cuerpo?.token === "string" ? cuerpo.token : "";
    const respuesta = cuerpo?.respuesta;

    if (!token || respuesta === undefined || respuesta === null || respuesta === "") {
      return NextResponse.json(
        { error: "Resuelve la verificación de seguridad para continuar." },
        { status: 400 }
      );
    }

    const resultado = validarDesafio(token, respuesta);
    if (!resultado.valido) {
      return NextResponse.json({ error: resultado.motivo }, { status: 400 });
    }

    return NextResponse.json(
      { ticket: resultado.ticket, expiraEn: resultado.expiraEn },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudo validar la verificación de seguridad." },
      { status: 500 }
    );
  }
}
