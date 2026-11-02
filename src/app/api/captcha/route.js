import { NextResponse } from "next/server";
import { crearDesafio, validarDesafio } from "@/lib/captcha";
import {
  claveIp,
  limitar,
  segundosParaReintentar,
} from "@/lib/seguridad/limiteIntentos";

export const dynamic = "force-dynamic";

const VENTANA_MS = 5 * 60 * 1000;

function respuestaDemasiadosIntentos(resultado) {
  return NextResponse.json(
    { error: "Demasiadas solicitudes. Espera unos minutos e intenta de nuevo." },
    {
      status: 429,
      headers: {
        "Retry-After": String(segundosParaReintentar(resultado)),
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET(request) {
  try {
    const limite = limitar(claveIp(request), 30, VENTANA_MS);
    if (!limite.permitido) return respuestaDemasiadosIntentos(limite);

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
    const limite = limitar(`captcha:${claveIp(request)}`, 30, VENTANA_MS);
    if (!limite.permitido) return respuestaDemasiadosIntentos(limite);

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
