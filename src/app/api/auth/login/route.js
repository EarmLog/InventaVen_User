import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { consumirTicket } from "@/lib/captcha";
import { traducirErrorAuth } from "@/lib/api/auth";
import {
  claveIp,
  limitar,
  reiniciarLimite,
  segundosParaReintentar,
} from "@/lib/seguridad/limiteIntentos";

export const dynamic = "force-dynamic";

const VENTANA_MS = 5 * 60 * 1000;

export async function POST(request) {
  try {
    const cuerpo = await request.json().catch(() => null);
    const correo =
      typeof cuerpo?.correo === "string"
        ? cuerpo.correo.trim().toLowerCase().slice(0, 254)
        : "";
    const contrasena =
      typeof cuerpo?.contrasena === "string" ? cuerpo.contrasena.slice(0, 200) : "";
    const captcha = typeof cuerpo?.captcha === "string" ? cuerpo.captcha : "";

    const limiteIp = limitar(claveIp(request), 30, VENTANA_MS);
    const limiteCuenta = correo
      ? limitar(`cuenta:${correo}`, 8, VENTANA_MS)
      : { permitido: true, reinicio: Date.now() };

    if (!limiteIp.permitido || !limiteCuenta.permitido) {
      const resultado = !limiteIp.permitido ? limiteIp : limiteCuenta;
      return NextResponse.json(
        { error: "Demasiados intentos. Espera unos minutos e intenta de nuevo." },
        {
          status: 429,
          headers: {
            "Retry-After": String(segundosParaReintentar(resultado)),
            "Cache-Control": "no-store",
          },
        }
      );
    }

    if (!captcha || !consumirTicket(captcha)) {
      return NextResponse.json(
        { error: "La verificación de seguridad expiró. Intenta de nuevo." },
        { status: 400 }
      );
    }

    if (!correo.includes("@") || !contrasena) {
      return NextResponse.json(
        { error: "Ingresa un correo y una contraseña válidos." },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const llave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !llave) {
      return NextResponse.json(
        { error: "El inicio de sesión no está configurado." },
        { status: 500 }
      );
    }

    const cliente = createClient(url, llave, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const { data, error } = await cliente.auth.signInWithPassword({
      email: correo,
      password: contrasena,
    });

    if (error || !data?.session) {
      return NextResponse.json(
        { error: traducirErrorAuth(error) },
        { status: 401 }
      );
    }

    reiniciarLimite(`cuenta:${correo}`);
    reiniciarLimite(claveIp(request));

    return NextResponse.json(
      {
        sesion: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudo iniciar sesión. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
