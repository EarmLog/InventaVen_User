"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Html5QrcodeScanner } from "html5-qrcode";
import { CheckCircle2, QrCode, Smartphone, Wifi } from "lucide-react";
import { obtenerClienteSupabase } from "@/lib/supabase/cliente";
import { reproducirPitidoExito } from "@/lib/utilidades/audio";

function ContenidoEscanerMovil() {
  const searchParams = useSearchParams();
  const canalId = searchParams.get("canal");
  const modo = searchParams.get("modo") === "pos" ? "pos" : "inventario";
  const [estado, setEstado] = useState("conectando");
  const [ultimoCodigo, setUltimoCodigo] = useState("");
  const ultimoEnvio = useRef({ codigo: "", momento: 0 });

  useEffect(() => {
    if (!canalId) return;
    const supabase = obtenerClienteSupabase();
    const canal = supabase.channel(`scanner-${canalId}`);

    canal.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setEstado("listo");
      }
    });

    const scanner = new Html5QrcodeScanner(
      "reader-mobile-scanner",
      {
        fps: 15,
        qrbox: { width: 280, height: 180 },
        rememberLastUsedCamera: true,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      },
      false
    );

    scanner.render(
      async (decodedText) => {
        const codigo = String(decodedText || "").trim();
        if (!codigo) return;
        const ahora = Date.now();
        if (
          ultimoEnvio.current.codigo === codigo &&
          ahora - ultimoEnvio.current.momento < 1800
        ) {
          return;
        }
        ultimoEnvio.current = { codigo, momento: ahora };

        reproducirPitidoExito();
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(80);
        }

        setUltimoCodigo(codigo);
        setEstado("enviando");
        try {
          await canal.send({
            type: "broadcast",
            event: "codigo-escaneado",
            payload: { codigo },
          });
          setEstado("enviado");
        } catch {
          setEstado("listo");
        }
        setTimeout(() => setEstado("listo"), 1200);
      },
      () => {}
    );

    return () => {
      scanner.clear().catch(() => null);
      supabase.removeChannel(canal);
    };
  }, [canalId]);

  if (!canalId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <h1 className="text-xl font-bold text-red-600">Enlace de escáner no válido</h1>
        <p className="mt-2 text-sm text-slate-600">Falta el identificador de canal del código QR.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 p-4 text-white">
      <header className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-emerald-400" />
          <span className="font-bold tracking-tight">InventaVen · Escáner Móvil</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold">
          <Wifi className={`h-3.5 w-3.5 ${estado === "listo" ? "text-emerald-400 animate-pulse" : "text-amber-400"}`} />
          {estado === "listo" ? "Conectado a PC" : estado === "enviando" || estado === "enviado" ? "¡Enviado!" : "Conectando..."}
        </div>
        <div className="flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold">
          <QrCode className="h-3.5 w-3.5 text-emerald-400" />
          {modo === "pos" ? "MODO: PUNTO DE VENTA" : "MODO: REGISTRO DE INVENTARIO"}
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center space-y-4">
        {estado === "enviado" ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-emerald-950/80 p-8 text-center border border-emerald-500/30">
            <CheckCircle2 className="h-16 w-16 text-emerald-400 animate-bounce" />
            <p className="mt-4 text-lg font-bold text-emerald-200">¡Código enviado a la PC!</p>
            <p className="mt-1 font-mono text-sm text-emerald-400">{ultimoCodigo}</p>
          </div>
        ) : null}

        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-black p-2">
          <div id="reader-mobile-scanner" className="w-full"></div>
        </div>

        <p className="text-center text-xs text-slate-400">
          {modo === "pos"
            ? "Apunta al código de barras. Los escaneos se envían a tu punto de venta y se agregan al carrito automáticamente."
            : "Apunta al código de barras del producto. Se enviará automáticamente a tu caja registradora en la computadora."}
        </p>
      </main>
    </div>
  );
}

export default function PaginaEscanerMovil() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Cargando escáner...</div>}>
      <ContenidoEscanerMovil />
    </Suspense>
  );
}
