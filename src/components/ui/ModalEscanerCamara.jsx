"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import Modal from "@/components/ui/Modal";
import Boton from "@/components/ui/Boton";
import { reproducirPitidoExito } from "@/lib/utilidades/audio";
import { Camera, RefreshCw, Zap, X } from "lucide-react";

export default function ModalEscanerCamara({ abierto, onCerrar, onScan }) {
  const scannerRef = useRef(null);
  const onScanRef = useRef(onScan);
  const onCerrarRef = useRef(onCerrar);
  const [camaraTrasera, setCamaraTrasera] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [errorCamara, setErrorCamara] = useState("");

  useEffect(() => {
    onScanRef.current = onScan;
    onCerrarRef.current = onCerrar;
  }, [onScan, onCerrar]);

  useEffect(() => {
    if (!abierto) {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => null);
        scannerRef.current = null;
      }
      return;
    }

    setCargando(true);
    setErrorCamara("");

    const html5QrCode = new Html5Qrcode("reader-scanner-box");
    scannerRef.current = html5QrCode;

    const config = {
      fps: 15,
      qrbox: { width: 280, height: 180 },
      aspectRatio: 1.0,
    };

    const iniciarCamara = async () => {
      try {
        const idCamara = camaraTrasera ? { facingMode: "environment" } : { facingMode: "user" };
        await html5QrCode.start(
          idCamara,
          config,
          (decodedText) => {
            const codigo = String(decodedText || "").trim();
            if (!codigo) return;
            html5QrCode.stop().catch(() => null);
            scannerRef.current = null;
            reproducirPitidoExito();
            onScanRef.current?.(codigo);
            onCerrarRef.current?.();
          },
          () => {}
        );
        setCargando(false);
      } catch (err) {
        console.error("Error al iniciar cámara:", err);
        setErrorCamara("No se pudo acceder a la cámara. Verifica los permisos en tu navegador.");
        setCargando(false);
      }
    };

    iniciarCamara();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => null);
        scannerRef.current = null;
      }
    };
  }, [abierto, camaraTrasera]);

  const cambiarCamara = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => null).finally(() => {
        setCamaraTrasera((prev) => !prev);
      });
    } else {
      setCamaraTrasera((prev) => !prev);
    }
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Escanear código de barras"
      descripcion="Apunta la cámara de tu teléfono hacia el código de barras del producto."
      ancho="sm"
    >
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-2xl bg-black border border-[var(--borde)] aspect-square flex items-center justify-center shadow-inner">
          <div id="reader-scanner-box" className="w-full h-full"></div>
          {cargando && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-xs font-semibold gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Iniciando cámara...
            </div>
          )}
          {errorCamara && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4 text-center text-xs space-y-2">
              <p className="text-red-300 font-semibold">{errorCamara}</p>
              <Boton variante="secundario" onClick={() => setCamaraTrasera((p) => !p)} className="bg-white text-black font-bold">
                Intentar con otra cámara
              </Boton>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <Boton
            type="button"
            variante="secundario"
            onClick={cambiarCamara}
            className="flex-1 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-bold py-3 rounded-xl shadow-sm flex items-center justify-center gap-2 text-xs"
          >
            <RefreshCw className="h-4 w-4" />
            Cambiar cámara ({camaraTrasera ? "Trasera" : "Frontal"})
          </Boton>
          <Boton
            type="button"
            variante="secundario"
            onClick={onCerrar}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 px-5 rounded-xl shadow-sm text-xs"
          >
            Cerrar
          </Boton>
        </div>
      </div>
    </Modal>
  );
}
