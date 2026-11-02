"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Smartphone, Wifi } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { obtenerClienteSupabase } from "@/lib/supabase/cliente";
import { reproducirPitidoExito } from "@/lib/utilidades/audio";

export default function ModalEmparejamientoQR({
  abierto,
  onCerrar,
  onScan,
  cerrarAlEscanear = true,
}) {
  const [canalId, setCanalId] = useState("");
  const [conectado, setConectado] = useState(false);
  const [ultimoCodigo, setUltimoCodigo] = useState("");
  const [totalEscaneos, setTotalEscaneos] = useState(0);
  const onScanRef = useRef(onScan);
  const onCerrarRef = useRef(onCerrar);
  const cerrarRef = useRef(cerrarAlEscanear);

  useEffect(() => {
    onScanRef.current = onScan;
    onCerrarRef.current = onCerrar;
    cerrarRef.current = cerrarAlEscanear;
  }, [onScan, onCerrar, cerrarAlEscanear]);

  useEffect(() => {
    if (!abierto) return;
    const id = Math.random().toString(36).substring(2, 10);
    setCanalId(id);
    setConectado(false);
    setUltimoCodigo("");
    setTotalEscaneos(0);

    const supabase = obtenerClienteSupabase();
    const canal = supabase.channel(`scanner-${id}`);

    canal
      .on("broadcast", { event: "codigo-escaneado" }, ({ payload }) => {
        const codigo = String(payload?.codigo || "").trim();
        if (!codigo) return;
        setUltimoCodigo(codigo);
        setTotalEscaneos((total) => total + 1);
        reproducirPitidoExito();
        onScanRef.current?.(codigo);
        if (cerrarRef.current) onCerrarRef.current?.();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConectado(true);
        }
      });

    return () => {
      supabase.removeChannel(canal);
    };
  }, [abierto]);

  const urlEscaneo =
    typeof window !== "undefined" && canalId
      ? `${window.location.origin}/escaner?canal=${canalId}`
      : "";
  const urlQr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(urlEscaneo)}`;

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Conectar escáner móvil (QR)"
      descripcion="Escanea este código QR con la cámara de tu teléfono para usarlo como pistola de códigos de barras."
      ancho="sm"
    >
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <div className="flex items-center gap-2 rounded-full bg-[var(--primario-suave)] px-3 py-1 text-xs font-semibold text-[var(--primario-fuerte)]">
          <Wifi
            className={`h-3.5 w-3.5 ${conectado ? "text-emerald-500 animate-pulse" : "text-amber-500"}`}
          />
          {conectado ? "Listo para recibir escaneos" : "Conectando canal seguro..."}
        </div>

        <div className="rounded-2xl border border-[var(--borde)] bg-white p-3 shadow-sm">
          {urlEscaneo ? (
            <img
              src={urlQr}
              alt="Código QR de emparejamiento"
              className="h-56 w-56 object-contain"
            />
          ) : (
            <div className="flex h-56 w-56 items-center justify-center text-xs text-[var(--texto-tenue)]">
              Generando QR...
            </div>
          )}
        </div>

        <p className="text-xs text-[var(--texto-suave)]">
          Apunta con la cámara de tu teléfono al código anterior o abre el enlace en tu
          celular. Al enfocar cualquier producto, se enviará al instante a esta pantalla.
        </p>

        {ultimoCodigo ? (
          <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-mono text-xs font-semibold">{ultimoCodigo}</span>
            <span className="text-[10px] opacity-70">({totalEscaneos})</span>
          </div>
        ) : null}

        <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--texto-tenue)]">
          <Smartphone className="h-4 w-4" />
          Cualquier Android o iPhone compatible
        </div>
      </div>
    </Modal>
  );
}
