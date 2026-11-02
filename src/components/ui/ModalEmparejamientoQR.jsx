"use client";

import { useEffect, useState } from "react";
import { QrCode, Smartphone, Wifi } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { obtenerClienteSupabase } from "@/lib/supabase/cliente";

export default function ModalEmparejamientoQR({ abierto, onCerrar, onScan }) {
  const [canalId, setCanalId] = useState("");
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    const id = Math.random().toString(36).substring(2, 10);
    setCanalId(id);
    setConectado(false);

    const supabase = obtenerClienteSupabase();
    const canal = supabase.channel(`scanner-${id}`);

    canal
      .on("broadcast", { event: "codigo-escaneado" }, ({ payload }) => {
        if (payload?.codigo) {
          onScan(payload.codigo);
          onCerrar();
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConectado(true);
        }
      });

    return () => {
      supabase.removeChannel(canal);
    };
  }, [abierto, onCerrar]);

  const urlEscaneo = typeof window !== "undefined" ? `${window.location.origin}/escaner?canal=${canalId}` : "";
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
          <Wifi className={`h-3.5 w-3.5 ${conectado ? "text-emerald-500 animate-pulse" : "text-amber-500"}`} />
          {conectado ? "Listo para recibir escaneos" : "Conectando canal seguro..."}
        </div>

        <div className="rounded-2xl border border-[var(--borde)] bg-white p-3 shadow-sm">
          {canalId ? (
            <img src={urlQr} alt="Código QR de emparejamiento" className="h-56 w-56 object-contain" />
          ) : (
            <div className="flex h-56 w-56 items-center justify-center text-xs text-[var(--texto-tenue)]">
              Generando QR...
            </div>
          )}
        </div>

        <p className="text-xs text-[var(--texto-suave)]">
          Apunta con la cámara de tu teléfono al código anterior o abre el enlace en tu celular. Al enfocar cualquier producto, aparecerá al instante aquí.
        </p>

        <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--texto-tenue)]">
          <Smartphone className="h-4 w-4" />
          Cualquier Android o iPhone compatible
        </div>
      </div>
    </Modal>
  );
}
