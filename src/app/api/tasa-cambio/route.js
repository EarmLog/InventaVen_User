import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

let cache = { valor: null, expira: 0 };

async function consultarV6(llave) {
  const respuesta = await fetch(
    `https://v6.exchangerate-api.com/v6/${llave}/latest/USD`,
    { cache: "no-store" }
  );
  if (!respuesta.ok) throw new Error("El servicio de tasa de cambio no respondió.");
  const datos = await respuesta.json();
  const tasa = Number(datos?.conversion_rates?.VES);
  if (!Number.isFinite(tasa) || tasa <= 0) {
    throw new Error("La tasa VES no vino en la respuesta del servicio.");
  }
  return {
    tasa,
    fecha: datos?.time_last_update_utc || new Date().toISOString(),
    fuente: "exchangerate-api-v6",
  };
}

async function consultarV4() {
  const respuesta = await fetch("https://api.exchangerate-api.com/v4/latest/USD", {
    cache: "no-store",
  });
  if (!respuesta.ok) throw new Error("No se pudo consultar la tasa de respaldo.");
  const datos = await respuesta.json();
  const tasa = Number(datos?.rates?.VES);
  if (!Number.isFinite(tasa) || tasa <= 0) {
    throw new Error("La tasa VES no vino en la respuesta de respaldo.");
  }
  return {
    tasa,
    fecha: datos?.date || new Date().toISOString(),
    fuente: "exchangerate-api-v4",
  };
}

export async function GET() {
  const ahora = Date.now();
  if (cache.valor && cache.expira > ahora) {
    return NextResponse.json(cache.valor);
  }

  try {
    const llave = process.env.EXCHANGERATE_API_KEY;
    let resultado;
    try {
      if (!llave) throw new Error("Sin llave configurada.");
      resultado = await consultarV6(llave);
    } catch {
      resultado = await consultarV4();
    }
    const respuesta = {
      tasa: Number(resultado.tasa.toFixed(4)),
      fecha: resultado.fecha,
      fuente: resultado.fuente,
      consultadoEn: new Date().toISOString(),
    };
    cache = { valor: respuesta, expira: ahora + 30 * 60 * 1000 };
    return NextResponse.json(respuesta, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=1800" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "No se pudo obtener la tasa del dólar.",
        detalle: error.message,
      },
      { status: 502 }
    );
  }
}
